import {
  SIDEBAR_PREFS,
  getSidebarPref,
  isValidSidebarPrefValue,
} from "../settings/sidebar_prefs.mjs";
import { SidebarEvents, sendLocalEvent } from "./events.mjs";

import { Logger } from "../utils/logger.mjs";
import { PreferencesWrapper } from "../wrappers/preferences.mjs";
import { SidebarControllers } from "../sidebar_controllers.mjs";
import { SidebarSettings } from "../settings/sidebar_settings.mjs"; // eslint-disable-line no-unused-vars

const PREF_DOMAIN = "second-sidebar.";

// The events the settings popup sends for each field (see
// SidebarMainSettingsController), so a change made through a pref is
// applied exactly like one made in the popup.
const FIELD_EVENTS = {
  position: SidebarEvents.EDIT_SIDEBAR_POSITION,
  padding: SidebarEvents.EDIT_SIDEBAR_PADDING,
  allowWindowDragging: SidebarEvents.EDIT_SIDEBAR_ALLOW_WINDOW_DRAGGING,
  newWebPanelPosition: SidebarEvents.EDIT_SIDEBAR_NEW_WEB_PANEL_POSITION,
  defaultFloatingOffset: SidebarEvents.EDIT_SIDEBAR_DEFAULT_FLOATING_OFFSET,
  autoHideBackButton: SidebarEvents.EDIT_SIDEBAR_AUTO_HIDE_BACK_BUTTON,
  autoHideForwardButton: SidebarEvents.EDIT_SIDEBAR_AUTO_HIDE_FORWARD_BUTTON,
  enableSidebarBoxHint: SidebarEvents.EDIT_SIDEBAR_ENABLE_BOX_HINT,
  containerBorder: SidebarEvents.EDIT_SIDEBAR_CONTAINER_BORDER,
  tooltip: SidebarEvents.EDIT_SIDEBAR_TOOLTIP,
  tooltipFullUrl: SidebarEvents.EDIT_SIDEBAR_TOOLTIP_FULL_URL,
  hideSidebarAnimated: SidebarEvents.EDIT_SIDEBAR_AUTO_HIDE_ANIMATED,
  hideToolbarAnimated: SidebarEvents.EDIT_SIDEBAR_TOOLBAR_AUTO_HIDE_ANIMATED,
};

// Sent together in one EDIT_SIDEBAR_VISIBILITY event.
const VISIBILITY_FIELDS = [
  "autoHideSidebar",
  "autoHideSidebarBehavior",
  "sidebarWidgetHideWebPanel",
];

/**
 * Keeps the individual sidebar prefs (settings/sidebar_prefs.mjs), which
 * Sine's mod settings dialog edits, in step with this window's sidebar
 * settings. Every window observes the prefs and applies a change to itself.
 */
export class SidebarPrefsController {
  #writing = false;

  /**
   * Writes the prefs from the settings just loaded, then starts applying
   * changes made to them from Sine or about:config.
   *
   * @param {SidebarSettings} settings
   */
  init(settings) {
    this.writePrefs(settings);
    PreferencesWrapper.addObserver(PREF_DOMAIN, this);
    window.addEventListener(
      "unload",
      () => PreferencesWrapper.removeObserver(PREF_DOMAIN, this),
      { once: true },
    );
  }

  /**
   * Called after the sidebar settings are saved, so Sine shows them too.
   *
   * @param {SidebarSettings} settings
   */
  writePrefs(settings) {
    for (const entry of SIDEBAR_PREFS) {
      const value = settings[entry.field];
      if (this.#read(entry) !== value) {
        this.#write(entry, value);
      }
    }
  }

  /**
   * nsIObserver callback for changes under PREF_DOMAIN.
   *
   * @param {*} _subject
   * @param {string} _topic
   * @param {string} prefName
   */
  observe(_subject, _topic, prefName) {
    const entry = getSidebarPref(prefName);
    if (!entry || this.#writing) {
      return;
    }

    const settings = SidebarControllers.sidebarController.dumpSettings();
    const value = this.#read(entry);
    if (!isValidSidebarPrefValue(entry, value)) {
      // Reset in about:config, or set to something the sidebar doesn't
      // support: put back the setting that's in effect.
      this.#write(entry, settings[entry.field]);
      return;
    }
    if (settings[entry.field] === value) {
      return;
    }

    Logger.debug(`Sidebar setting ${entry.field} changed to`, value);
    settings[entry.field] = value;
    this.#apply(entry.field, settings);
    SidebarControllers.sidebarController.saveSettings();
  }

  /**
   * @param {string} field
   * @param {SidebarSettings} settings
   */
  #apply(field, settings) {
    if (VISIBILITY_FIELDS.includes(field)) {
      sendLocalEvent(SidebarEvents.EDIT_SIDEBAR_VISIBILITY, {
        autoHideSidebar: settings.autoHideSidebar,
        autoHideSidebarBehavior: settings.autoHideSidebarBehavior,
        sidebarWidgetHideWebPanel: settings.sidebarWidgetHideWebPanel,
        sidebarWidgetShortcut: settings.sidebarWidgetShortcut,
      });
    } else if (FIELD_EVENTS[field]) {
      sendLocalEvent(FIELD_EVENTS[field], { value: settings[field] });
    } else {
      console.error(`No event applies the sidebar setting ${field}`);
    }
  }

  /**
   * @param {{pref: string, values?: string[]}} entry
   * @returns {string | boolean | undefined} undefined if the pref is
   *   missing or of another type.
   */
  #read(entry) {
    try {
      return entry.values
        ? PreferencesWrapper.getStringPref(entry.pref)
        : PreferencesWrapper.getBoolPref(entry.pref);
    } catch {
      return undefined;
    }
  }

  /**
   * @param {{pref: string, values?: string[]}} entry
   * @param {string | boolean} value
   */
  #write(entry, value) {
    this.#writing = true;
    try {
      // A pref set by hand to another type has to be cleared before it can
      // be written with this one.
      if (PreferencesWrapper.prefHasUserValue(entry.pref)) {
        if (this.#read(entry) === undefined) {
          PreferencesWrapper.clearUserPref(entry.pref);
        }
      }
      if (entry.values) {
        PreferencesWrapper.setStringPref(entry.pref, value);
      } else {
        PreferencesWrapper.setBoolPref(entry.pref, value);
      }
    } catch (error) {
      console.error(`Failed to write sidebar pref ${entry.pref}:`, error);
    } finally {
      this.#writing = false;
    }
  }
}
