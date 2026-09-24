import { BrowserElements } from "../browser_elements.mjs";
import { Logger } from "../utils/logger.mjs";
import { SidebarControllers } from "../sidebar_controllers.mjs";
import { SidebarElements } from "../sidebar_elements.mjs";
import { WindowWrapper } from "../wrappers/window.mjs";
import { XULElement } from "../xul/base/xul_element.mjs";
import { gNavToolboxWrapper } from "../wrappers/g_nav_toolbox.mjs";

const FULLSCREEN_ANIMATE_ATTRIBUTE = "fullscreenShouldAnimate";
const ANIMATE_ATTRIBUTE = "shouldAnimate";
const TRIGGER_WIDTH = 16;
const HIDE_DELAY = 500;
const SHOW_DELAY = 200;

export class SidebarMainCollapser {
  constructor() {
    this.window = new WindowWrapper();
    this.lastOpenedWebPanel = null;
    this.showSidebarTimer = null;
    this.hideSidebarTimer = null;
    this.lastBlockingButtons = "";
    this.#setupListeners();
  }

  #setupListeners() {
    BrowserElements.root.addEventListener("click", this);
    BrowserElements.root.addEventListener("mousemove", this);
    BrowserElements.root.addEventListener("dragover", this);
    BrowserElements.root.addEventListener("dragleave", this);
    BrowserElements.root.addEventListener("drop", this);
    BrowserElements.root.addEventListener("mouseleave", this);
    window.addEventListener("fullscreen", () => this.onWindowFullscreen());
    SidebarElements.sidebarCollapseButton.addEventListener("click", () =>
      this.onSidebarCollapseButtonClick(),
    );

    gNavToolboxWrapper.addEventListener("customizationready", () => {
      SidebarElements.sidebarMain.removeAttribute("overlay");
    });

    gNavToolboxWrapper.addEventListener("aftercustomization", () => {
      const { autoHideSidebar, autoHideSidebarBehavior } =
        SidebarControllers.sidebarController;
      if (autoHideSidebar && autoHideSidebarBehavior === "overlay") {
        SidebarElements.sidebarMain.setAttribute("overlay", true);
      }
    });
  }

  /**
   *
   * @param {boolean} animate
   */
  shouldAnimate(animate) {
    SidebarElements.sidebarMain.toggleAttribute(ANIMATE_ATTRIBUTE, animate);
  }

  /**
   *
   * @param {boolean} animate
   */
  fullScreenShouldAnimate(animate) {
    SidebarElements.sidebarMain.toggleAttribute(
      FULLSCREEN_ANIMATE_ATTRIBUTE,
      animate,
    );
  }

  onWindowFullscreen() {
    if (window.fullScreen) {
      // Show sidebar and then immediately hide with fullscreen animation
      this.uncollapse({ animate: false, delay: 0 });
      setTimeout(() => {
        this.collapse({ animate: false, fullScreenAnimate: true, delay: 0 });
      }, 0);
    } else {
      if (SidebarControllers.sidebarController.autoHideSidebar) {
        // Show sidebar and then immediately hide with fullscreen animation
        this.uncollapse({ animate: false, delay: 0 });
        setTimeout(() => {
          this.collapse({
            animate: false,
            fullScreenAnimate: true,
            delay: 0,
          });
        });
      } else {
        this.uncollapse({ delay: 0 });
      }
    }
  }

  onSidebarCollapseButtonClick() {
    if (SidebarControllers.sidebarController.autoHideSidebar) {
      return;
    }
    if (this.collapsed()) {
      this.uncollapse({
        delay: 0,
        restoreLastOpenedWebPanel:
          SidebarControllers.sidebarController.sidebarWidgetHideWebPanel,
      });
      SidebarElements.sidebarCollapseButton.setOpen(true);
    } else {
      this.collapse({
        delay: 0,
        saveLastOpenedWebPanel:
          SidebarControllers.sidebarController.sidebarWidgetHideWebPanel,
      });
      SidebarElements.sidebarCollapseButton.setOpen(false);
    }
  }

  /**
   *
   * @param {MouseEvent} event
   */
  handleEvent(event) {
    const window = new WindowWrapper();
    if (
      (!window.fullScreen &&
        !SidebarControllers.sidebarController.autoHideSidebar) ||
      window.document.fullscreenElement
    ) {
      return;
    }

    const openedButtons = SidebarElements.sidebarMain.querySelectorAll(
      "toolbarbutton:not(.sb2-main-web-panel-button)[open]",
    );
    this.#logBlockingButtons(openedButtons);
    if (openedButtons.length > 0) {
      return;
    }

    if (event.type === "mouseleave") {
      if (event.explicitOriginalTarget?.id === "main-window") {
        this.collapse();
      }
      return;
    }

    if (
      event.type === "click" &&
      !this.isEventInsidePanel(event) &&
      !this.isEventInsideSidebarMain(event)
    ) {
      this.collapse({ delay: 0 });
      return;
    }

    const position = SidebarElements.sidebarWrapper.getPosition();
    const isLeft = position === "left";
    const isRight = position === "right";
    const collapsed = this.collapsed();
    const root = new XULElement({ element: window.document.documentElement });
    const rootRect = root.getBoundingClientRect();
    const sidebarRect = SidebarElements.sidebarMain.getBoundingClientRect();
    const leftEdge = window.mozInnerScreenX;
    const rightEdge = leftEdge + rootRect.width;
    const screenX = this.#getScreenX(event, leftEdge);

    const isInUncollapseArea =
      (collapsed &&
        ((isRight && screenX > rightEdge - TRIGGER_WIDTH) ||
          (isLeft && screenX < leftEdge + TRIGGER_WIDTH))) ||
      (!collapsed &&
        ((isRight && screenX > rightEdge - sidebarRect.width) ||
          (isLeft && screenX < leftEdge + sidebarRect.width)));

    const hitTest = {
      isRight,
      collapsed,
      screenX,
      leftEdge,
      rightEdge,
      sidebarRect,
    };
    if (isInUncollapseArea) {
      if (collapsed && !this.showSidebarTimer) {
        this.#logHoverDecision("show", event, hitTest);
      }
      this.uncollapse();
    } else if (!this.isPanelOpened()) {
      if (!collapsed && !this.hideSidebarTimer) {
        this.#logHoverDecision("hide", event, hitTest);
      }
      this.collapse();
    }
  }

  /**
   * Horizontal screen position of a mouse event, in this window's CSS
   * pixels. Events from inside a web panel bubble up here from the web
   * panels' embedded window, but their screenX doesn't match this window's
   * mozInnerScreenX: at the right edge of a 1914px Zen window on Windows it
   * put the pointer ~80px further right than it was, so the sidebar showed
   * (and stayed shown) far from the edge (issue #10). Map those events
   * through the embedded browser's box in this window instead.
   *
   * @param {MouseEvent} event
   * @param {number} leftEdge This window's mozInnerScreenX.
   * @returns {number}
   */
  #getScreenX(event, leftEdge) {
    const webPanelsBrowser = SidebarElements.webPanelsBrowser.getXUL();
    const view = event.view;
    if (!view || view !== webPanelsBrowser.contentWindow || !view.innerWidth) {
      return event.screenX;
    }
    const rect = webPanelsBrowser.getBoundingClientRect();
    return (
      leftEdge + rect.left + (event.clientX / view.innerWidth) * rect.width
    );
  }

  /**
   * Debug-only record of what auto-hide based a show/hide decision on, in
   * screen pixels, so a report of it triggering in the wrong place can be
   * diagnosed from the Browser Console.
   *
   * @param {string} action
   * @param {MouseEvent} event
   * @param {object} hitTest
   * @param {boolean} hitTest.isRight
   * @param {boolean} hitTest.collapsed
   * @param {number} hitTest.screenX
   * @param {number} hitTest.leftEdge
   * @param {number} hitTest.rightEdge
   * @param {DOMRect} hitTest.sidebarRect
   */
  #logHoverDecision(
    action,
    event,
    { isRight, collapsed, screenX, leftEdge, rightEdge, sidebarRect },
  ) {
    if (!Logger.enabled) {
      return;
    }
    const zoneWidth = collapsed ? TRIGGER_WIDTH : sidebarRect.width;
    const zone = isRight
      ? [rightEdge - zoneWidth, rightEdge]
      : [leftEdge, leftEdge + zoneWidth];
    const sidebar = [leftEdge + sidebarRect.left, leftEdge + sidebarRect.right];
    const range = ([start, end]) => `${Math.round(start)}-${Math.round(end)}`;
    const target = event.target;
    const targetName = `${target?.localName ?? "?"}${target?.id ? "#" + target.id : ""}`;
    const view =
      event.view === window ? "browser window" : (event.view?.name ?? "?");
    const rawScreenX =
      screenX === event.screenX ? "" : ` (event screenX ${event.screenX})`;
    Logger.debug(
      `Auto-hide: ${action} sidebar on ${event.type} at screenX ` +
        `${Math.round(screenX)}${rawScreenX}; zone ${range(zone)}, window ` +
        `${range([leftEdge, rightEdge])}, sidebar ${range(sidebar)}, ` +
        `target ${targetName} in ${view}`,
    );
  }

  /**
   * Debug-only record of sidebar buttons whose open popup keeps auto-hide
   * from reacting to the mouse, logged when that set changes.
   *
   * @param {NodeList} openedButtons
   */
  #logBlockingButtons(openedButtons) {
    const ids = [...openedButtons]
      .map((button) => button.id || button.localName)
      .join(", ");
    if (ids === this.lastBlockingButtons) {
      return;
    }
    this.lastBlockingButtons = ids;
    Logger.debug(
      ids
        ? `Auto-hide: paused while open: ${ids}`
        : "Auto-hide: resumed after popup closed",
    );
  }

  /**
   *
   * @returns {boolean}
   */
  isPanelOpened() {
    return (
      SidebarElements.sidebarMainMenuPopup.isPanelOpen() ||
      SidebarElements.sidebarMainPopupSettings.isPanelOpen() ||
      SidebarElements.webPanelMenuPopup.isPanelOpen() ||
      SidebarElements.webPanelPopupNew.isPanelOpen() ||
      SidebarElements.webPanelPopupEdit.isPanelOpen() ||
      SidebarElements.webPanelPopupDelete.isPanelOpen()
    );
  }

  /**
   *
   * @param {MouseEvent} event
   */
  isEventInsidePanel(event) {
    const target = new XULElement({ element: event.target });
    return (
      SidebarElements.sidebarMainMenuPopup.contains(target) ||
      SidebarElements.sidebarMainPopupSettings.contains(target) ||
      SidebarElements.webPanelMenuPopup.contains(target) ||
      SidebarElements.webPanelPopupNew.contains(target) ||
      SidebarElements.webPanelPopupEdit.contains(target) ||
      SidebarElements.webPanelPopupDelete.contains(target)
    );
  }

  /**
   *
   * @param {MouseEvent} event
   */
  isEventInsideSidebarMain(event) {
    const target = new XULElement({ element: event.target });
    return SidebarElements.sidebarMain.contains(target);
  }

  /**
   *
   * @returns {boolean}
   */
  collapsed() {
    return SidebarControllers.sidebarMainController.collapsed();
  }

  /**
   *
   * @param {object} params
   * @param {boolean} params.animate
   * @param {boolean} params.fullScreenAnimate
   * @param {number} params.delay
   * @param {boolean} params.saveLastOpenedWebPanel
   */
  collapse({
    animate = SidebarControllers.sidebarController.hideSidebarAnimated,
    fullScreenAnimate = false,
    delay = HIDE_DELAY,
    saveLastOpenedWebPanel = false,
  } = {}) {
    clearTimeout(this.showSidebarTimer);
    this.showSidebarTimer = null;
    if (!this.hideSidebarTimer) {
      this.hideSidebarTimer = setTimeout(() => {
        this.shouldAnimate(animate);
        this.fullScreenShouldAnimate(fullScreenAnimate);
        SidebarControllers.sidebarMainController.collapse({
          animated: animate || fullScreenAnimate,
        });
        if (saveLastOpenedWebPanel) {
          const webPanelController =
            SidebarControllers.webPanelsController.getActive();
          if (webPanelController) {
            this.lastOpenedWebPanel = webPanelController.getUUID();
            SidebarControllers.sidebarController.close();
          }
        }
        this.hideSidebarTimer = null;
      }, delay);
    }
  }

  /**
   *
   * @param {object} animate
   * @param {boolean} params.animate
   * @param {boolean} params.fullScreenAnimate
   * @param {number} params.delay
   * @param {boolean} params.restoreLastOpenedWebPanel
   */
  uncollapse({
    animate = SidebarControllers.sidebarController.hideSidebarAnimated,
    fullScreenAnimate = false,
    delay = SHOW_DELAY,
    restoreLastOpenedWebPanel = false,
  } = {}) {
    clearTimeout(this.hideSidebarTimer);
    this.hideSidebarTimer = null;
    if (!this.showSidebarTimer) {
      this.showSidebarTimer = setTimeout(() => {
        this.shouldAnimate(animate);
        this.fullScreenShouldAnimate(fullScreenAnimate);
        SidebarControllers.sidebarMainController.uncollapse();
        if (restoreLastOpenedWebPanel && this.lastOpenedWebPanel) {
          const webPanelController = SidebarControllers.webPanelsController.get(
            this.lastOpenedWebPanel,
          );
          webPanelController?.switchWebPanel({ forceOpen: true });
          this.lastOpenedWebPanel = null;
        }
        this.showSidebarTimer = null;
      }, delay);
    }
  }
}
