import { fetchFirstAvailable, importPatchedModule } from "../utils/files.mjs";
import {
  patchPopupNotificationsSource,
  reportUnappliedPatches,
} from "./source_patches.mjs";

const MODULE_URL = "resource://gre/modules/PopupNotifications.sys.mjs";
const PATCHED_MODULE_RELATIVE_PATH = "fss/PopupNotifications.sys.mjs";

export class PopupNotificationsPatcher {
  static patch() {
    console.log("Patching PopupNotifications.sys.mjs...");
    this.#patch().then(
      (complete) =>
        console.log(
          complete
            ? "PopupNotifications.sys.mjs was patched"
            : "PopupNotifications.sys.mjs was only partly patched (see the warning above)",
        ),
      (error) =>
        console.error("Failed to patch PopupNotifications.sys.mjs:", error),
    );
  }

  /**
   * @returns {Promise<boolean>} false if any patch no longer applies
   */
  static async #patch() {
    const { source, unmatched } = patchPopupNotificationsSource(
      await fetchFirstAvailable([MODULE_URL]),
    );
    reportUnappliedPatches("PopupNotifications.sys.mjs", unmatched);
    const module = await importPatchedModule(
      PATCHED_MODULE_RELATIVE_PATH,
      source,
    );
    this.#defineLazyGetter(module);
    return unmatched.length === 0;
  }

  /**
   * @param {Object} module
   */
  static #defineLazyGetter(module) {
    const childWindow = window[1];
    ChromeUtils.defineLazyGetter(childWindow, "PopupNotifications", () => {
      try {
        let shouldSuppress = () => {
          return false;
        };
        const getVisibleAnchorElement = () => {
          return childWindow.document.getElementById("mainPopupSet");
        };
        return new module.PopupNotifications(
          childWindow.gBrowser,
          childWindow.document.getElementById("notification-popup"),
          childWindow.document.getElementById("notification-popup-box"),
          { shouldSuppress, getVisibleAnchorElement },
        );
      } catch (ex) {
        console.error(ex);
        return null;
      }
    });
  }
}
