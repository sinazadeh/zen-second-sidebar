/**
 * @typedef {Object} ExtensionPolicy
 * @property {string} id
 * @property {string} name
 * @property {{manifest: object}?} extension
 * @property {function(string):string} getURL
 */

export class WebExtensionPolicyWrapper {
  /**
   *
   * @returns {ExtensionPolicy[]}
   */
  static getActiveExtensions() {
    return WebExtensionPolicy.getActiveExtensions();
  }

  /**
   * The extension whose pages are served from `moz-extension://<hostname>/`.
   *
   * @param {string} hostname The extension's internal UUID.
   * @returns {ExtensionPolicy?}
   */
  static getByHostname(hostname) {
    return WebExtensionPolicy.getByHostname(hostname);
  }
}
