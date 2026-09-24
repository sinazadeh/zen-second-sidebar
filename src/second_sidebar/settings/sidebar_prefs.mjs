// Individual about:config prefs mirroring the sidebar settings, so Sine can
// show them in its mod settings dialog (preferences.json at the repo root).
// SidebarSettings (the `second-sidebar.settings` JSON pref) stays the source
// of truth: these prefs are written from it at startup and on every save,
// and a change made to one of them is applied and saved back
// (controllers/sidebar_prefs.mjs). Keyboard shortcuts are left out: they
// need the settings popup's key capture.
//
// Keep this module free of browser globals: tests/sidebar_prefs.test.mjs
// checks it against SidebarSettings and preferences.json in Node.

const SIZES = [
  "xxsmall",
  "xsmall",
  "small",
  "medium",
  "large",
  "xlarge",
  "xxlarge",
];

/**
 * In the settings popup's order. An entry with `values` is a string pref
 * limited to those values; one without is a boolean pref.
 *
 * @type {Array<{field: string, pref: string, values?: string[]}>}
 */
export const SIDEBAR_PREFS = [
  {
    field: "position",
    pref: "second-sidebar.position",
    values: ["left", "right"],
  },
  { field: "padding", pref: "second-sidebar.width", values: SIZES },
  {
    field: "allowWindowDragging",
    pref: "second-sidebar.allow-window-dragging",
  },
  { field: "autoHideSidebar", pref: "second-sidebar.auto-hide" },
  {
    field: "autoHideSidebarBehavior",
    pref: "second-sidebar.auto-hide-behavior",
    values: ["inline", "overlay"],
  },
  {
    field: "sidebarWidgetHideWebPanel",
    pref: "second-sidebar.hide-web-panel-when-hidden",
  },
  {
    field: "defaultFloatingOffset",
    pref: "second-sidebar.default-floating-offset",
    values: SIZES,
  },
  {
    field: "newWebPanelPosition",
    pref: "second-sidebar.new-web-panel-position",
    values: ["before", "after"],
  },
  { field: "enableSidebarBoxHint", pref: "second-sidebar.show-geometry-hint" },
  {
    field: "containerBorder",
    pref: "second-sidebar.container-indicator",
    values: ["off", "left", "right", "top", "bottom", "around"],
  },
  {
    field: "tooltip",
    pref: "second-sidebar.tooltip",
    values: ["off", "title", "url", "titleandurl"],
  },
  { field: "tooltipFullUrl", pref: "second-sidebar.tooltip-full-url" },
  {
    field: "autoHideForwardButton",
    pref: "second-sidebar.auto-hide-forward-button",
  },
  { field: "autoHideBackButton", pref: "second-sidebar.auto-hide-back-button" },
  { field: "hideSidebarAnimated", pref: "second-sidebar.animate-sidebar" },
  {
    field: "hideToolbarAnimated",
    pref: "second-sidebar.animate-web-panel-toolbar",
  },
];

const SIDEBAR_PREFS_BY_NAME = new Map(
  SIDEBAR_PREFS.map((entry) => [entry.pref, entry]),
);

/**
 * @param {string} prefName
 * @returns {{field: string, pref: string, values?: string[]} | undefined}
 */
export function getSidebarPref(prefName) {
  return SIDEBAR_PREFS_BY_NAME.get(prefName);
}

/**
 * @param {{field: string, pref: string, values?: string[]}} entry
 * @param {*} value A value read from the pref (undefined if it's missing).
 * @returns {boolean}
 */
export function isValidSidebarPrefValue(entry, value) {
  return entry.values
    ? entry.values.includes(value)
    : typeof value === "boolean";
}
