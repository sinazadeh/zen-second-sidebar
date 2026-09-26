import {
  applyContainerColor,
  fillContainerMenuList,
} from "../utils/containers.mjs";
import {
  createCancelButton,
  createCreateButton,
  createInput,
  createMenuList,
  createPopupGroup,
  createPopupRow,
  createPopupSet,
} from "../utils/xul.mjs";

import { Panel } from "./base/panel.mjs";
import { PanelMultiView } from "./base/panel_multi_view.mjs";
import { PopupBody } from "./popup_body.mjs";
import { PopupFooter } from "./popup_footer.mjs";
import { PopupHeader } from "./popup_header.mjs";
import { ScriptSecurityManagerWrapper } from "../wrappers/script_security_manager.mjs";
import { Toggle } from "./base/toggle.mjs";
import { ToolbarSeparator } from "./base/toolbar_separator.mjs";
import {
  getExtensionPresets,
  getWebsitePresets,
} from "../utils/web_panel_presets.mjs";
import { isLeftMouseButton } from "../utils/buttons.mjs";

const CUSTOM_PRESET = "custom";

export class WebPanelPopupNew extends Panel {
  constructor() {
    super({
      id: "sb2-web-panel-new",
      classList: ["sb2-popup", "sb2-popup-with-header"],
    });
    this.setType("arrow").setRole("group");

    this.presetMenuList = createMenuList({
      id: "sb2-web-panel-preset-menu-list",
    });
    this.presets = new Map();
    this.input = createInput({ placeholder: "Web page URL" });
    this.containerMenuList = createMenuList({ id: "sb2-container-menu-list" });
    this.temporaryToggle = new Toggle();

    this.saveButton = createCreateButton();
    this.cancelButton = createCancelButton();
    this.#compose();

    this.addEventListener("popupshown", () => {
      this.input.focus();
    });

    // A preset fills in the URL; editing it by hand makes it custom again.
    this.presetMenuList.addEventListener("command", () => {
      const preset = this.#getPreset();
      this.input.setValue(preset ? preset.url : this.suggest);
      this.input.focus();
    });
    this.input.addEventListener("input", () => {
      if (this.#getPreset()?.url !== this.input.getValue()) {
        this.presetMenuList.setValue(CUSTOM_PRESET);
      }
    });
  }

  #compose() {
    this.appendChild(
      new PanelMultiView().appendChildren(
        new PopupHeader("New Web Panel"),
        new PopupBody().appendChildren(
          createPopupSet("", [
            createPopupGroup("Preset", this.presetMenuList),
            new ToolbarSeparator(),
            createPopupRow(this.input),
            new ToolbarSeparator(),
            createPopupGroup("Multi-Account Container", this.containerMenuList),
            new ToolbarSeparator(),
            createPopupGroup("Temporary", this.temporaryToggle),
          ]),
        ),
        new PopupFooter().appendChildren(this.cancelButton, this.saveButton),
      ),
    );
  }

  /**
   *
   * @param {function(string, string, boolean, import("../utils/web_panel_presets.mjs").WebPanelPresetSettings):void} callback
   *   Called with the URL, container, whether the panel is temporary, and the
   *   settings of the chosen preset ({} for a custom URL).
   * @returns {WebPanelPopupNew}
   */
  listenSaveButtonClick(callback) {
    this.input.addEventListener("keyup", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (event.key === "Enter" || event.keyCode === 13) {
        callback(
          this.input.getValue(),
          this.containerMenuList.getValue(),
          this.temporaryToggle.getPressed(),
          this.#getPreset()?.settings ?? {},
        );
      }
    });
    this.saveButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (isLeftMouseButton(event)) {
        callback(
          this.input.getValue(),
          this.containerMenuList.getValue(),
          this.temporaryToggle.getPressed(),
          this.#getPreset()?.settings ?? {},
        );
      }
    });
  }

  /**
   *
   * @param {function(string):void} callback
   * @returns {WebPanelPopupNew}
   */
  listenCancelButtonClick(callback) {
    this.cancelButton.addEventListener("click", (event) => {
      if (isLeftMouseButton(event)) {
        callback(this.input.getValue());
      }
    });
  }

  /**
   *
   * @param {XULElement | Widget} target
   * @param {string} suggest
   * @returns {WebPanelPopupNew}
   */
  openPopup(target, suggest) {
    this.suggest = suggest;
    this.input.setValue(suggest);
    this.#fillPresetMenuList();

    fillContainerMenuList(this.containerMenuList);
    this.containerMenuList.setValue(
      ScriptSecurityManagerWrapper.DEFAULT_USER_CONTEXT_ID,
    );
    applyContainerColor(
      ScriptSecurityManagerWrapper.DEFAULT_USER_CONTEXT_ID,
      this.containerMenuList.getXUL(),
    );

    this.temporaryToggle.setPressed(false);

    return Panel.prototype.openPopupWithinWindow.call(this, target);
  }

  /**
   *
   * @returns {import("../utils/web_panel_presets.mjs").WebPanelPreset?}
   */
  #getPreset() {
    return this.presets.get(this.presetMenuList.getValue()) ?? null;
  }

  /**
   * Lists common websites and the sidebars of installed extensions (e.g.
   * Bitwarden); the latter are looked up each time since extensions can be
   * added or removed.
   */
  #fillPresetMenuList() {
    let extensionPresets = [];
    try {
      extensionPresets = getExtensionPresets();
    } catch (error) {
      console.error("Failed to list extension sidebars:", error);
    }
    const websitePresets = getWebsitePresets();
    this.presets = new Map(
      [...websitePresets, ...extensionPresets].map((preset) => [
        preset.id,
        preset,
      ]),
    );

    this.presetMenuList.removeAllItems();
    this.presetMenuList.appendItem("Custom URL", CUSTOM_PRESET);
    for (const presets of [websitePresets, extensionPresets]) {
      if (presets.length > 0) {
        this.presetMenuList.appendSeparator();
      }
      for (const preset of presets) {
        this.presetMenuList.appendItem(preset.name, preset.id);
        if (preset.iconURL) {
          const menuItem = this.presetMenuList.getLastMenuItemXUL();
          menuItem.classList.add("menuitem-iconic");
          menuItem.setAttribute("image", preset.iconURL);
        }
      }
    }
    this.presetMenuList.setValue(CUSTOM_PRESET);
  }
}
