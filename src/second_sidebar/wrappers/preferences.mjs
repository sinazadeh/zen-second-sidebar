export class PreferencesWrapper {
  /**
   *
   * @param {string} pref
   * @returns {boolean}
   */
  static prefHasUserValue(pref) {
    return Services.prefs.prefHasUserValue(pref);
  }

  /**
   *
   * @param {string} pref
   * @returns {string}
   */
  static getStringPref(pref) {
    return Services.prefs.getStringPref(pref);
  }

  /**
   *
   * @param {string} pref
   * @param {string} value
   */
  static setStringPref(pref, value) {
    return Services.prefs.setStringPref(pref, value);
  }

  /**
   *
   * @param {string} pref
   */
  static clearUserPref(pref) {
    return Services.prefs.clearUserPref(pref);
  }

  /**
   *
   * @param {string} pref
   * @returns {boolean}
   */
  static getBoolPref(pref) {
    return Services.prefs.getBoolPref(pref);
  }

  /**
   *
   * @param {string} pref
   * @param {boolean} value
   */
  static setBoolPref(pref, value) {
    return Services.prefs.setBoolPref(pref, value);
  }

  /**
   * Notifies `observer.observe(subject, topic, prefName)` whenever a pref
   * whose name starts with `domain` changes.
   *
   * @param {string} domain
   * @param {{observe: function(*, string, string):void}} observer
   */
  static addObserver(domain, observer) {
    Services.prefs.addObserver(domain, observer);
  }

  /**
   *
   * @param {string} domain
   * @param {{observe: function(*, string, string):void}} observer
   */
  static removeObserver(domain, observer) {
    Services.prefs.removeObserver(domain, observer);
  }
}
