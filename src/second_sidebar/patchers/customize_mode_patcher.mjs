import { fetchFirstAvailable, importPatchedModule } from "../utils/files.mjs";
import {
  patchCustomizeModeSource,
  reportUnappliedPatches,
} from "./source_patches.mjs";

// Older and newer Firefox versions ship CustomizeMode.sys.mjs from different
// locations.
const MODULE_URLS = [
  "resource:///modules/CustomizeMode.sys.mjs",
  "moz-src:///browser/components/customizableui/CustomizeMode.sys.mjs",
];
const PATCHED_MODULE_RELATIVE_PATH = "fss/CustomizeMode.sys.mjs";

export class CustomizeModePatcher {
  static patch() {
    console.log("Patching CustomizeMode.sys.mjs...");
    this.#patch().then(
      (complete) =>
        console.log(
          complete
            ? "CustomizeMode.sys.mjs was patched"
            : "CustomizeMode.sys.mjs was only partly patched (see the warning above)",
        ),
      (error) => console.error("Failed to patch CustomizeMode.sys.mjs:", error),
    );
  }

  /**
   * @returns {Promise<boolean>} false if any patch no longer applies
   */
  static async #patch() {
    const { source, unmatched } = patchCustomizeModeSource(
      await fetchFirstAvailable(MODULE_URLS),
    );
    reportUnappliedPatches("CustomizeMode.sys.mjs", unmatched);
    const module = await importPatchedModule(
      PATCHED_MODULE_RELATIVE_PATH,
      source,
    );
    this.#defineLazyGetter(module);
    return unmatched.length === 0;
  }

  /**
   *
   * @param {Object} module
   */
  static #defineLazyGetter(module) {
    ChromeUtils.defineLazyGetter(window, "gCustomizeMode", () => {
      return new module.CustomizeMode(window);
    });
  }
}
