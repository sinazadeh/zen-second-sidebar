import { GfxInfoWrapper } from "../../wrappers/gfx_info.mjs";
import { PreferencesWrapper } from "../../wrappers/preferences.mjs";
import { Widget } from "./widget.mjs"; // eslint-disable-line no-unused-vars
import { XULElement } from "./xul_element.mjs";

// Overrides whether popups opened "within the window" (see
// Panel#openPopupWithinWindow) are fitted to the room beside their anchor:
// true = always, false = never, unset = only on Wayland.
const FIT_TO_WINDOW_PREF = "second-sidebar.fit-popups-to-window";

// Room kept between a fitted popup and the top/bottom of the window; also
// covers the popup's own border and shadow.
const WINDOW_EDGE_MARGIN = 24;

/**
 * Whether popups opened "within the window" need fitting by us. Firefox
 * slides or shrinks a popup that doesn't fit on screen, except on Wayland:
 * there it can't know where the window is on screen and leaves that to the
 * compositor, and some compositors don't do it. A tall popup opened low in
 * the sidebar then runs off the bottom of the screen, taking its Save
 * button with it.
 *
 * @returns {boolean}
 */
function shouldFitToWindow() {
  if (PreferencesWrapper.prefHasUserValue(FIT_TO_WINDOW_PREF)) {
    try {
      return PreferencesWrapper.getBoolPref(FIT_TO_WINDOW_PREF);
    } catch (error) {
      console.warn(`"${FIT_TO_WINDOW_PREF}" must be a boolean:`, error);
    }
  }
  return GfxInfoWrapper.isWayland;
}

export class Panel extends XULElement {
  /**
   *
   * @param {object} params
   * @param {string?} params.id
   * @param {Array<string>} params.classList
   */
  constructor({ id = null, classList = [] } = {}) {
    super({ tag: "panel", id, classList: [...classList, "panel-no-padding"] });
    this.setAttribute("level", "top");
  }

  /**
   *
   * @param {string} type
   * @returns {Panel}
   */
  setType(type) {
    return this.setAttribute("type", type);
  }

  /**
   *
   * @param {string} role
   * @returns {Panel}
   */
  setRole(role) {
    return this.setAttribute("role", role);
  }

  /**
   *
   * @returns {Panel}
   */
  hidePopup() {
    this.element.hidePopup();
    return this;
  }

  /**
   *
   * @param {XULElement | Widget} target
   * @param {string} position
   * @returns {Panel}
   */
  openPopup(target, position = "start_before") {
    this.element.openPopup(target.getXUL(), position);
    return this;
  }

  /**
   *
   * @param {number} screenX
   * @param {number} screenY
   * @returns {Panel}
   */
  openPopupAtScreen(screenX, screenY) {
    this.element.openPopupAtScreen(screenX, screenY);
    return this;
  }

  /**
   * Opens the popup beside `target`, like `openPopup(target)`. Where Firefox
   * doesn't keep popups on screen itself (see shouldFitToWindow), the popup
   * grows upwards from the target's bottom edge instead of downwards from
   * its top edge when there's more room above, and its height is capped to
   * the room on that side (the popup body scrolls).
   *
   * @param {XULElement | Widget} target
   * @returns {Panel}
   */
  openPopupWithinWindow(target) {
    const anchor = target.getXUL();
    let position = "start_before";
    if (shouldFitToWindow()) {
      const { top, bottom } = anchor.getBoundingClientRect();
      if (this.#fitToRoom(window.innerHeight - top, bottom)) {
        position = "start_after";
      }
    } else {
      this.removeProperty("--sb2-popup-max-height");
    }
    this.element.openPopup(anchor, position);
    return this;
  }

  /**
   * `openPopupAtScreen` counterpart of `openPopupWithinWindow`: where
   * needed, the popup grows upwards from the point instead of downwards
   * when there's more room above it, capped to the room on that side.
   *
   * @param {number} screenX
   * @param {number} screenY
   * @returns {Panel}
   */
  openPopupAtScreenWithinWindow(screenX, screenY) {
    if (!shouldFitToWindow()) {
      this.removeProperty("--sb2-popup-max-height");
      this.element.openPopupAtScreen(screenX, screenY);
      return this;
    }
    const clientY = screenY - window.mozInnerScreenY;
    const growUp = this.#fitToRoom(window.innerHeight - clientY, clientY);
    this.element.openPopupAtScreenRect(
      growUp ? "before_start" : "after_start",
      screenX,
      screenY,
      0,
      0,
    );
    return this;
  }

  /**
   * Caps the popup's height (see css/popups.mjs) to the larger of the two
   * spaces, in CSS pixels, and says which one that is.
   *
   * @param {number} roomBelow
   * @param {number} roomAbove
   * @returns {boolean} true if the popup should grow upwards
   */
  #fitToRoom(roomBelow, roomAbove) {
    const room = Math.max(roomBelow, roomAbove) - WINDOW_EDGE_MARGIN;
    this.setProperty(
      "--sb2-popup-max-height",
      `${Math.max(0, Math.floor(room))}px`,
    );
    return roomAbove > roomBelow;
  }

  /**
   *
   * @param {XULElement} target
   * @param {string} position
   * @returns {Panel}
   */
  moveToAnchor(target, position = "start_before") {
    this.element.moveToAnchor(target.getXUL(), position);
    return this;
  }

  /**
   *
   * @returns {boolean}
   */
  isPanelOpen() {
    return this.getAttributeBool("panelopen");
  }

  /**
   *
   * @returns {string}
   */
  getState() {
    return this.element.state;
  }
}
