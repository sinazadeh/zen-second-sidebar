export class GfxInfoWrapper {
  /**@type {boolean?} */
  static #isWayland = null;

  /**
   * Whether the browser runs as a native Wayland client (not XWayland).
   *
   * @returns {boolean}
   */
  static get isWayland() {
    if (this.#isWayland === null) {
      try {
        this.#isWayland = Cc["@mozilla.org/gfx/info;1"]
          .getService(Ci.nsIGfxInfo)
          .windowProtocol.startsWith("wayland");
      } catch {
        // windowProtocol is only implemented on Linux.
        this.#isWayland = false;
      }
    }
    return this.#isWayland;
  }
}
