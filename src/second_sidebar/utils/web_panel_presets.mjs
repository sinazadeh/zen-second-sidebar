import { getExtensionSidebarPanels } from "./extension_panels.mjs";

/**
 * @typedef {Object} WebPanelPresetSettings Settings a preset gives a new web
 *   panel; anything left out (geometry, toolbar, unloading...) keeps its
 *   default, since that's the user's preference rather than the site's.
 * @property {boolean} [mobile]
 * @property {boolean} [dynamicFavicon]
 * @property {string} [faviconURL]
 */

/**
 * @typedef {Object} WebPanelPreset
 * @property {string} id
 * @property {string} name
 * @property {string} url
 * @property {string?} [iconURL] Shown in the preset list; only local icons
 *   (extensions'), so opening the list doesn't contact every site.
 * @property {WebPanelPresetSettings} settings
 */

/** @type {Array<{name: string, url: string, mobile?: boolean}>} */
const WEBSITES = [
  { name: "ChatGPT", url: "https://chatgpt.com/" },
  { name: "Claude", url: "https://claude.ai/new", mobile: true },
  {
    name: "Desmos Scientific Calculator",
    url: "https://www.desmos.com/scientific",
  },
  { name: "Gemini", url: "https://gemini.google.com/" },
  {
    name: "Google Calendar",
    url: "https://calendar.google.com/calendar/u/0/r",
  },
  { name: "Google Translate", url: "https://translate.google.com/" },
  { name: "Instagram", url: "https://www.instagram.com/" },
  { name: "LinkedIn", url: "https://www.linkedin.com/feed/" },
  {
    name: "Microsoft To Do",
    url: "https://to-do.live.com/tasks/inbox",
    mobile: true,
  },
  { name: "Reddit", url: "https://www.reddit.com/" },
  { name: "Telegram", url: "https://web.telegram.org/", mobile: true },
  { name: "WhatsApp", url: "https://web.whatsapp.com/" },
  { name: "X", url: "https://x.com/home", mobile: true },
  { name: "YouTube Music", url: "https://music.youtube.com/" },
];

/**
 * Extension sidebar pages to open somewhere other than their declared
 * `sidebar_action.default_panel`, keyed by extension id and relative to the
 * extension's base URL (`moz-extension://<internal-uuid>/`).
 *
 * @type {Object<string, string>}
 */
const EXTENSION_PAGES = {
  // Bitwarden: straight to the vault tab.
  "{446900e4-71c2-419f-a6a7-df9c091e268b}":
    "popup/index.html?uilocation=sidebar#/tabs/vault",
};

/**
 * @returns {WebPanelPreset[]}
 */
export function getWebsitePresets() {
  return WEBSITES.map(({ name, url, mobile = false }) => ({
    id: `website:${url}`,
    name,
    url,
    settings: { mobile, dynamicFavicon: true },
  }));
}

/**
 * Sidebars of installed extensions. Their pages don't set a favicon, so the
 * extension's icon is kept fixed rather than following the page (which
 * would show a generic icon).
 *
 * @returns {WebPanelPreset[]}
 */
export function getExtensionPresets() {
  return getExtensionSidebarPanels().map(
    ({ id, name, url, baseURL, iconURL }) => {
      const page = EXTENSION_PAGES[id];
      return {
        id: `extension:${id}`,
        name,
        url: page ? new URL(page, baseURL).href : url,
        iconURL,
        settings: iconURL
          ? { mobile: false, dynamicFavicon: false, faviconURL: iconURL }
          : { mobile: false, dynamicFavicon: true },
      };
    },
  );
}
