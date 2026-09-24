import { Logger } from "../utils/logger.mjs";
import { reportUnappliedPatches } from "./source_patches.mjs";

// How often and for how long to wait for gURLBar.valueFormatter to appear
// (see #patchValueFormatterUpdate): 600 * 50ms = 30s.
const VALUE_FORMATTER_RETRY_MS = 50;
const VALUE_FORMATTER_MAX_ATTEMPTS = 600;

export class UrlbarInputPatcher {
  static patch() {
    console.log("Patching #urlbar-input...");
    this.#defineLazyGetter();
    this.#patchTabSwitchFocusChange();
    this.#patchValueFormatterUpdate();
    this.#suppressValueFormatterErrors();
    console.log("#urlbar-input was patched");
  }

  static #defineLazyGetter() {
    const childWindow = window[1];
    const urlbarInput = childWindow.document.querySelector("#urlbar-input");
    ChromeUtils.defineLazyGetter(urlbarInput, "editor", () => null);
  }

  static #patchTabSwitchFocusChange() {
    const urlbar = window[1].gURLBar;
    const afterTabSelectAndFocusChange = urlbar._afterTabSelectAndFocusChange;
    if (typeof afterTabSelectAndFocusChange !== "function") {
      reportUnappliedPatches("UrlbarInput", [
        "skip the tab-switch focus handler while the hidden urlbar has no view",
      ]);
      return;
    }

    urlbar._afterTabSelectAndFocusChange = function (...args) {
      // The hidden urlbar may have no view. Its focus handler must not
      // interrupt tab removal before the temporary panel is deleted.
      if (!this.view) return;
      return afterTabSelectAndFocusChange.apply(this, args);
    };
  }

  /**
   * The hidden urlbar's editor is always null (see #defineLazyGetter), but
   * UrlbarValueFormatter.update() still dereferences it and throws whenever
   * something reformats the address bar here. permitUnload does exactly
   * that *synchronously inside* gBrowser.removeTab() (tab close/unload), so
   * the uncaught throw aborts the removal partway: our own cleanup never
   * runs and the underlying tab (and page) is left alive in the background.
   * Replacing update() with a no-op removes the crash at its source instead
   * of merely hiding the resulting error.
   *
   * gURLBar.valueFormatter doesn't exist yet when patch() runs (it fires on
   * browser-window-before-show, before Firefox creates gURLBar), so retry
   * until it does - but not forever, in case a browser update renamed it.
   *
   * Newer Firefox (where gURLBar is a <moz-urlbar> element) keeps the
   * formatter private and makes update() async, so it can no longer throw
   * synchronously inside removeTab() and there is nothing to patch: the
   * rejected promise it leaves behind is filtered by
   * #suppressValueFormatterErrors.
   */
  static #patchValueFormatterUpdate() {
    const childWindow = window[1];
    let attempts = 0;
    const tryPatch = () => {
      attempts++;
      if (childWindow.closed) {
        console.log(
          `UrlbarValueFormatter patch abandoned after ${attempts} attempt(s): hidden window closed`,
        );
        return;
      }
      const urlbar = childWindow.gURLBar;
      if (urlbar?.localName === "moz-urlbar" && !("valueFormatter" in urlbar)) {
        Logger.debug(
          "UrlbarValueFormatter patch not needed: the formatter is private and update() is async",
        );
        return;
      }
      const valueFormatter = urlbar?.valueFormatter;
      if (typeof valueFormatter?.update !== "function") {
        if (attempts >= VALUE_FORMATTER_MAX_ATTEMPTS) {
          reportUnappliedPatches("UrlbarInput", [
            "make UrlbarValueFormatter.update a no-op: gURLBar.valueFormatter.update never appeared",
          ]);
          return;
        }
        setTimeout(tryPatch, VALUE_FORMATTER_RETRY_MS);
        return;
      }
      valueFormatter.update = async () => {};
      console.log(
        `UrlbarValueFormatter.update patched to a no-op after ${attempts} attempt(s)`,
      );
    };
    tryPatch();
  }

  static #suppressValueFormatterErrors() {
    const childWindow = window[1];
    // Belt-and-suspenders fallback for the same underlying issue as
    // #patchValueFormatterUpdate, in case some other path still reaches
    // UrlbarValueFormatter (e.g. before that patch takes effect). Swallow
    // just that specific benign error rather than every error.
    const isValueFormatterError = (error) =>
      error?.fileName?.includes("UrlbarValueFormatter.sys.mjs") ||
      error?.stack?.includes("UrlbarValueFormatter.sys.mjs");

    childWindow.addEventListener("error", (event) => {
      if (
        event.filename?.includes("UrlbarValueFormatter.sys.mjs") ||
        isValueFormatterError(event.error)
      ) {
        event.preventDefault();
      }
    });
    childWindow.addEventListener("unhandledrejection", (event) => {
      if (isValueFormatterError(event.reason)) {
        event.preventDefault();
      }
    });
  }
}
