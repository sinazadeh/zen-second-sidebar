/**
 * @typedef {Object} URI
 * @property {string} scheme
 * @property {string} host
 * @property {string} spec
 * @property {string} specIgnoringRef
 */

export class FaviconsWrapper {
  /**
   *
   * @param {number} value
   */
  static setDefaultIconURIPreferredSize(value) {
    Favicons.setDefaultIconURIPreferredSize(value);
  }

  /**
   * The URL of the favicon Places has stored for a page, if any.
   *
   * @param {URI} uri
   * @returns {Promise<string?>}
   */
  static getFaviconURLForPage(uri) {
    if ("getFaviconURLForPage" in Favicons) {
      return new Promise((resolve) =>
        Favicons.getFaviconURLForPage(uri, (faviconURI) =>
          resolve(faviconURI?.spec ?? null),
        ),
      );
    }
    return Favicons.getFaviconForPage(uri).then(
      (favicon) => favicon?.uri?.spec ?? null,
    );
  }
}
