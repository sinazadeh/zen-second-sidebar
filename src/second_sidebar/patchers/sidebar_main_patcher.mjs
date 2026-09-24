import { fetchFirstAvailable, importPatchedModule } from "../utils/files.mjs";
import {
  extractToolboxEventHandlers,
  reportUnappliedPatches,
} from "./source_patches.mjs";

import { SidebarElements } from "../sidebar_elements.mjs";

const MODULE_URL = "chrome://browser/content/navigator-toolbox.js";
const PATCHED_MODULE_RELATIVE_PATH = "fss/navigator-toolbox.mjs";

export class SidebarMainPatcher {
  static patch() {
    console.log("Patching #sb2-main...");
    this.#patch().then(
      (complete) =>
        console.log(
          complete
            ? "#sb2-main was patched"
            : "#sb2-main was only partly patched (see the warning above)",
        ),
      (error) => console.error("Failed to patch #sb2-main:", error),
    );
  }

  /**
   * @returns {Promise<boolean>} false if any patch no longer applies
   */
  static async #patch() {
    const { source, unmatched } = extractToolboxEventHandlers(
      await fetchFirstAvailable([MODULE_URL]),
    );
    reportUnappliedPatches("navigator-toolbox.js", unmatched);
    if (unmatched.length > 0) return false;
    const module = await importPatchedModule(
      PATCHED_MODULE_RELATIVE_PATH,
      source,
    );
    this.#addListeners(module);
    return true;
  }

  /**
   * @param {object} module
   */
  static #addListeners(module) {
    for (const [funcName, func] of Object.entries(module)) {
      const eventName = funcName.toLowerCase().replace(/^on/, "");
      SidebarElements.sidebarMain.addEventListener(eventName, func);
    }
  }
}
