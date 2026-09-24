export class AppStartupWrapper {
  /**
   * Restarts the browser the way Firefox's own restart prompts do: observers
   * of "quit-application-requested" (e.g. a download or unsaved-form
   * prompt) get the chance to cancel it first.
   *
   * @returns {boolean} false if the restart was cancelled
   */
  static restart() {
    const cancelQuit = Cc["@mozilla.org/supports-PRBool;1"].createInstance(
      Ci.nsISupportsPRBool,
    );
    Services.obs.notifyObservers(
      cancelQuit,
      "quit-application-requested",
      "restart",
    );
    if (cancelQuit.data) {
      return false;
    }
    Services.startup.quit(
      Ci.nsIAppStartup.eAttemptQuit | Ci.nsIAppStartup.eRestart,
    );
    return true;
  }
}
