import { WebExtensionPolicyWrapper } from "../wrappers/web_extension_policy.mjs";

const PREFERRED_ICON_SIZE = 32;

/**
 * @typedef {Object} ExtensionSidebarPanel
 * @property {string} id The extension's id.
 * @property {string} name
 * @property {string} url Its sidebar page, e.g.
 *   `moz-extension://<internal-uuid>/popup/index.html?uilocation=sidebar`.
 * @property {string} baseURL `moz-extension://<internal-uuid>/`.
 * @property {string?} iconURL
 */

/**
 * @param {string|Object<string, string>|undefined} icons A manifest icon: a
 *   path, or paths keyed by size.
 * @returns {string?} The smallest icon at least PREFERRED_ICON_SIZE wide, or
 *   the largest one there is.
 */
export function pickIcon(icons) {
  if (typeof icons === "string") {
    return icons;
  }
  if (!icons || typeof icons !== "object") {
    return null;
  }
  const sizes = Object.keys(icons)
    .map(Number)
    .filter((size) => Number.isFinite(size) && icons[size])
    .sort((a, b) => a - b);
  if (sizes.length === 0) {
    return null;
  }
  return icons[
    sizes.find((size) => size >= PREFERRED_ICON_SIZE) ?? sizes.at(-1)
  ];
}

/**
 * @param {import("../wrappers/web_extension_policy.mjs").ExtensionPolicy} policy
 * @returns {string?}
 */
function getIconURL(policy) {
  const manifest = policy.extension?.manifest;
  const path =
    pickIcon(manifest?.icons) ??
    pickIcon(manifest?.sidebar_action?.default_icon);
  return path ? policy.getURL(path) : null;
}

/**
 * Installed extensions that have a sidebar page (`sidebar_action`), which
 * can be opened in a web panel. Their URLs contain the extension's internal
 * UUID, which is different in every profile, so they're looked up rather
 * than hardcoded.
 *
 * @returns {ExtensionSidebarPanel[]} Sorted by name.
 */
export function getExtensionSidebarPanels() {
  const panels = [];
  for (const policy of WebExtensionPolicyWrapper.getActiveExtensions()) {
    const panel = policy.extension?.manifest?.sidebar_action?.default_panel;
    if (!panel) {
      continue;
    }
    panels.push({
      id: policy.id,
      name: policy.name,
      url: policy.getURL(panel),
      baseURL: policy.getURL(""),
      iconURL: getIconURL(policy),
    });
  }
  return panels.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * @param {{scheme: string, host: string}} uri
 * @returns {string?} The icon of the extension serving a `moz-extension:`
 *   page. Such pages have no favicon in Places, and their host is the
 *   extension's internal UUID, which Google's favicon service doesn't know.
 */
export function getExtensionIconURLForPage(uri) {
  if (uri.scheme !== "moz-extension") {
    return null;
  }
  const policy = WebExtensionPolicyWrapper.getByHostname(uri.host);
  return policy ? getIconURL(policy) : null;
}
