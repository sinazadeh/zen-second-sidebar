import { PreferencesWrapper } from "../wrappers/preferences.mjs";
import {
  backupFile,
  fileExists,
  migrateLegacyFile,
  readFile,
  writeFile,
} from "../utils/files.mjs";

export class Settings {
  /**
   *
   * @param {string} pref
   * @returns {Object | Array<Object> | null}
   */
  static load(pref) {
    if (!PreferencesWrapper.prefHasUserValue(pref)) {
      return null;
    }
    const value = PreferencesWrapper.getStringPref(pref);
    try {
      return JSON.parse(value);
    } catch (error) {
      // The next save replaces the unreadable value with defaults, so keep
      // a copy for the user to recover from.
      const backupPref = `${pref}.corrupt`;
      PreferencesWrapper.setStringPref(backupPref, value);
      console.error(
        `Failed to parse pref "${pref}", using defaults. Its value was kept in "${backupPref}":`,
        error,
      );
      return null;
    }
  }

  /**
   *
   * @param {string} pref
   * @param {Object | Array<Object>} value
   */
  static save(pref, value) {
    PreferencesWrapper.setStringPref(pref, JSON.stringify(value));
  }
}

/**
 * Same as `Settings`, but backs large/scaling data (arrays that grow with the
 * number of web panels) with a JSON file instead of a preference. Firefox
 * warns and degrades when a single preference value grows too large, so this
 * keeps that data out of prefs.js as Gecko itself recommends.
 */
export class FileSettings {
  /**
   *
   * @param {string} path
   * @param {string} legacyPref
   * @returns {Promise<Object | Array<Object> | null>}
   */
  static async load(path, legacyPref) {
    await migrateLegacyFile(path);

    if (await fileExists(path)) {
      try {
        return JSON.parse(await readFile(path));
      } catch (error) {
        // The next save overwrites the unreadable file with defaults (e.g.
        // an empty panel list), so keep a copy for the user to recover from.
        let backupPath = null;
        try {
          backupPath = await backupFile(path, "corrupt");
        } catch (backupError) {
          console.error(`Failed to back up "${path}":`, backupError);
        }
        console.error(
          `Failed to read "${path}", using defaults.` +
            (backupPath ? ` A copy was kept as "${backupPath}".` : ""),
          error,
        );
        return null;
      }
    }

    // Migrate data written by older versions that stored it in a preference.
    if (PreferencesWrapper.prefHasUserValue(legacyPref)) {
      try {
        const value = JSON.parse(PreferencesWrapper.getStringPref(legacyPref));
        await FileSettings.save(path, value);
        PreferencesWrapper.clearUserPref(legacyPref);
        return value;
      } catch (error) {
        console.error(
          `Failed to parse legacy pref "${legacyPref}", using defaults. The pref was left in place:`,
          error,
        );
        return null;
      }
    }

    return null;
  }

  /**
   *
   * @param {string} path
   * @param {Object | Array<Object>} value
   */
  static async save(path, value) {
    await writeFile(path, JSON.stringify(value));
  }
}
