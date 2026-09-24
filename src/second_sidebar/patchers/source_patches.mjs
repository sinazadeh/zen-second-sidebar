import { AppInfoWrapper } from "../wrappers/app_info.mjs";

// Text patches applied to Firefox's own source files before the patchers in
// this folder re-import them. Every patch is checked to still match, so a
// Firefox/Zen update that changes the targeted code logs a clear warning
// instead of silently leaving the patch unapplied. This module touches no
// browser globals when imported, so tests/ and
// scripts/check_patch_targets.mjs can run the same patches against real
// Firefox sources in Node.

const ISSUES_URL =
  "https://github.com/sinazadeh/zen-second-sidebar-enhanced/issues";

/**
 * @typedef {object} SourcePatch
 * @property {string} description what the patch is for, shown when it no longer matches
 * @property {string|RegExp} search
 * @property {string} replacement
 * @property {boolean} [all] replace every occurrence of a string search (a global RegExp always does)
 */

/**
 * @typedef {object} PatchResult
 * @property {string} source
 * @property {Array<string>} unmatched descriptions of the patches that found nothing to change
 */

export const CUSTOMIZE_MODE_PATCHES = [
  {
    description:
      "route getPlaceForItem through a version that knows about #sb2-main",
    search: "CustomizableUI.getPlaceForItem",
    replacement: "getPlaceForItem",
    all: true,
  },
  {
    description: "use the window's own CustomizableUI",
    search: /([^/])(CustomizableUI)(\.)/gm,
    replacement: "$1window.$2$3",
  },
  {
    description:
      "keep #browser (and the sidebar in it) visible in customize mode",
    search: "browser.hidden = true",
    replacement: "browser.hidden = false",
  },
  {
    description: "call removeListener on the module's own CustomizableUI",
    search: "window.CustomizableUI.removeListener",
    replacement: "CustomizableUI.removeListener",
  },
];

export const POPUP_NOTIFICATIONS_PATCHES = [
  {
    description:
      "show notifications for web panel tabs, which are never the selected browser",
    search: /(let isActiveBrowser = ).+/gm,
    replacement: "$1true;",
  },
  {
    description:
      "show notifications although the web panels window is never focused",
    search: /(let isActiveWindow = ).+/gm,
    replacement: "$1true;",
  },
  {
    description:
      "handle notification button clicks without focusing the web panels window first",
    search: /(this\.window\.focus\(\);)\s+return;/gm,
    replacement: "$1",
  },
];

/**
 * @param {string} source
 * @param {Array<SourcePatch>} patches applied in order, each to the previous one's output
 * @returns {PatchResult}
 */
export function applySourcePatches(source, patches) {
  const unmatched = [];
  for (const { description, search, replacement, all = false } of patches) {
    // A fresh non-global RegExp: .test() on a global one is stateful.
    const matches =
      typeof search === "string"
        ? source.includes(search)
        : new RegExp(search.source, search.flags.replace("g", "")).test(source);
    if (!matches) {
      unmatched.push(description);
      continue;
    }
    source = all
      ? source.replaceAll(search, replacement)
      : source.replace(search, replacement);
  }
  return { source, unmatched };
}

/**
 * @param {string} source CustomizeMode.sys.mjs
 * @returns {PatchResult}
 */
export function patchCustomizeModeSource(source) {
  const result = applySourcePatches(source, CUSTOMIZE_MODE_PATCHES);
  result.source += getPlaceForItem.toString();
  return result;
}

/**
 * @param {string} source PopupNotifications.sys.mjs
 * @returns {PatchResult}
 */
export function patchPopupNotificationsSource(source) {
  return applySourcePatches(source, POPUP_NOTIFICATIONS_PATCHES);
}

/**
 * Turns navigator-toolbox.js's event handler functions (onPopupShowing,
 * onCommand, ...) into a module exporting them, so #sb2-main can reuse them.
 *
 * @param {string} source navigator-toolbox.js
 * @returns {PatchResult}
 */
export function extractToolboxEventHandlers(source) {
  const functions = Array.from(
    source.matchAll(/\s{4}function.*?^\s{4}}/gms),
    (match) => match[0].replace(/\s{4}function/gm, "export function"),
  );
  return {
    source: functions.join("\n"),
    unmatched:
      functions.length > 0 ? [] : ["export the toolbar event handlers"],
  };
}

/**
 * Warns (never throws) about patches that no longer match, with the browser
 * version, so a breaking browser update is easy to diagnose and report.
 *
 * @param {string} target the patched file
 * @param {Array<string>} unmatched
 */
export function reportUnappliedPatches(target, unmatched) {
  for (const description of unmatched) {
    console.warn(
      `Second Sidebar: a ${target} patch no longer applies on ${AppInfoWrapper.description} (${description}). The related feature may misbehave; please report this at ${ISSUES_URL}`,
    );
  }
}

/**
 * Appended to the patched CustomizeMode.sys.mjs (see CUSTOMIZE_MODE_PATCHES)
 * so customize mode treats #sb2-main like the overflow panel.
 *
 * @param {HTMLElement} aElement
 * @returns {string}
 */
function getPlaceForItem(aElement) {
  let place;
  let node = aElement;
  while (node && !place) {
    if (node.id == "sb2-main") {
      place = "panel";
    } else if (node.localName == "toolbar") {
      place = "toolbar";
    } else if (node.id == CustomizableUI.AREA_FIXED_OVERFLOW_PANEL) {
      place = "panel";
    } else if (node.id == "customization-palette") {
      place = "palette";
    }

    node = node.parentNode;
  }
  return place;
}
