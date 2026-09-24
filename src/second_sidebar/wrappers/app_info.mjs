export class AppInfoWrapper {
  /**
   * The running browser and engine version, for diagnostics, e.g.
   * "Zen 1.22.2b (Gecko 149.0)".
   *
   * @returns {string}
   */
  static get description() {
    const { name, version, platformVersion } = Services.appinfo;
    return `${name} ${version} (Gecko ${platformVersion})`;
  }
}
