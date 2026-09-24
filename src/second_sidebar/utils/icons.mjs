import { FaviconsWrapper } from "../wrappers/favicons.mjs";
import { Logger } from "./logger.mjs";
import { NetUtilWrapper } from "../wrappers/net_utils.mjs";

const PREDEFINED_ICONS = {
  "about:newtab": "chrome://branding/content/icon32.png",
  "about:home": "chrome://branding/content/icon32.png",
  "about:welcome": "chrome://branding/content/icon32.png",
  "about:privatebrowsing": "chrome://browser/skin/privatebrowsing/favicon.svg",
  "about:debugging": "chrome://global/skin/icons/developer.svg",
  "about:config": "chrome://global/skin/icons/settings.svg",
  "about:processes": "chrome://global/skin/icons/performance.svg",
  "about:addons": "chrome://mozapps/skin/extensions/extension.svg",
  "about:settings": "chrome://global/skin/icons/settings.svg",
  "about:preferences": "chrome://global/skin/icons/settings.svg",
  "chrome://browser/content/preferences/preferences.xhtml":
    "chrome://global/skin/icons/settings.svg",
  "chrome://browser/content/places/bookmarksSidebar.xhtml":
    "chrome://browser/skin/bookmark.svg",
  "about:downloads": "chrome://browser/skin/downloads/downloads.svg",
  "chrome://browser/content/downloads/contentAreaDownloadsView.xhtml":
    "chrome://browser/skin/downloads/downloads.svg",
  "chrome://browser/content/places/places.xhtml":
    "chrome://browser/skin/library.svg",
};

export const FALLBACK_ICON = "chrome://global/skin/icons/defaultFavicon.svg";

const ICON_LOAD_TIMEOUT = 5000;

/**
 * @param {string} url
 * @returns {Promise<boolean>} Whether the URL loads as an image in this
 *   window. An icon that doesn't (unreachable host, a domain tracking
 *   protection blocks, an error page) would leave its button blank.
 */
function loadsAsImage(url) {
  return new Promise((resolve) => {
    const image = new Image();
    const done = (loaded) => {
      clearTimeout(timer);
      image.onload = image.onerror = null;
      resolve(loaded);
    };
    const timer = setTimeout(() => done(false), ICON_LOAD_TIMEOUT);
    image.onload = () => done(true);
    image.onerror = () => done(false);
    image.src = url;
  });
}

/**
 * @param {Array<string?>} urls Icon URLs, best first; empty ones are skipped.
 * @returns {Promise<string>} The first that loads, or FALLBACK_ICON.
 */
export async function firstLoadableIcon(urls) {
  for (const url of urls) {
    if (url && (await loadsAsImage(url))) {
      return url;
    }
  }
  return FALLBACK_ICON;
}

/**
 * Finds an icon for a page, trying in order: the copy of its favicon stored
 * in Places (read locally, so it shows even when the icon's own server
 * can't be reached from here), that favicon's own URL, Google's favicon
 * service, and finally FALLBACK_ICON, using the first that actually loads.
 *
 * @param {string} url
 * @param {object} params
 * @param {boolean} params.local Allow the local `cached-favicon:` copy. Off
 *   when the result is saved in settings, which can be exported to another
 *   profile whose Places doesn't have the icon.
 * @returns {Promise<string>}
 */
export async function fetchIconURL(url, { local = true } = {}) {
  let uri;
  try {
    uri = NetUtilWrapper.newURI(url);
  } catch {
    return FALLBACK_ICON;
  }
  if (uri.specIgnoringRef in PREDEFINED_ICONS) {
    return PREDEFINED_ICONS[uri.specIgnoringRef];
  }

  FaviconsWrapper.setDefaultIconURIPreferredSize(32);
  const faviconURL = await FaviconsWrapper.getFaviconURLForPage(uri).catch(
    () => null,
  );
  let host = "";
  try {
    host = uri.host;
  } catch {
    // about:, data: and other URLs without a host.
  }

  const iconURL = await firstLoadableIcon([
    local && faviconURL ? `cached-favicon:${faviconURL}` : null,
    faviconURL,
    host ? `https://www.google.com/s2/favicons?domain=${host}&sz=32` : null,
  ]);
  Logger.debug(`Icon for ${url}:`, iconURL);
  return iconURL;
}

/**
 *
 * @param {string} url
 * @returns {Promise<boolean>}
 */
export async function isIconAvailable(url) {
  try {
    const response = await fetch(url, { credentials: "include" });
    return response.status === 200;
  } catch {
    return false;
  }
}

/**
 *
 * @param {string} url
 * @param {string} urlAlt
 * @returns {Promise<string>}
 */
export async function useAvailableIcon(url, urlAlt) {
  return (await isIconAvailable(url)) ? url : urlAlt;
}
