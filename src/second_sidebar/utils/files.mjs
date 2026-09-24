import { ChromeRegistry } from "../wrappers/chrome_registry.mjs";
import { DirectoryServiceWrapper } from "../wrappers/directory_service.mjs";
import { IOUtilsWrapper } from "../wrappers/io_utils.mjs";
import { PathUtilsWrapper } from "../wrappers/path_utils.mjs";

// Persistent data (settings, state) lives directly under the profile's
// chrome/ directory (Gecko's own "UChrm" key - see DirectoryServiceWrapper),
// never inside a loader- or mod-manager-owned folder, so it survives addon
// updates/reinstalls under any loader (Sine deletes and re-extracts its
// entire mod folder - including anything written inside it - on every
// update).

/**
 *
 * @param {string} relativePath
 * @param {string} data
 */
export async function writeFile(relativePath, data) {
  const path = makeDataPath(relativePath);
  await IOUtilsWrapper.writeUTF8(path, data);
}

/**
 *
 * @param {string} relativePath
 * @returns {Promise<string>}
 */
export async function readFile(relativePath) {
  const path = makeDataPath(relativePath);
  return await IOUtilsWrapper.readUTF8(path);
}

/**
 *
 * @param {string} relativePath
 * @returns {Promise<boolean>}
 */
export async function fileExists(relativePath) {
  const path = makeDataPath(relativePath);
  return await IOUtilsWrapper.exists(path);
}

/**
 *
 * @param {string} relativePath
 */
export async function removeFile(relativePath) {
  const path = makeDataPath(relativePath);
  await IOUtilsWrapper.remove(path);
}

/**
 * Copies a data file next to itself under a timestamped name, e.g.
 * `web-panels.json` -> `web-panels.corrupt-2026-09-24T10-00-00-000Z.json`.
 *
 * @param {string} relativePath
 * @param {string} label
 * @returns {Promise<string>} the copy's relative path
 */
export async function backupFile(relativePath, label) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const extensionIndex = relativePath.lastIndexOf(".");
  const backupPath =
    extensionIndex > relativePath.lastIndexOf("/")
      ? `${relativePath.slice(0, extensionIndex)}.${label}-${timestamp}${relativePath.slice(extensionIndex)}`
      : `${relativePath}.${label}-${timestamp}`;
  await IOUtilsWrapper.copy(
    makeDataPath(relativePath),
    makeDataPath(backupPath),
  );
  return backupPath;
}

/**
 *
 * @param {string} relativePath
 * @returns {string}
 */
function makeDataPath(relativePath) {
  const rootParts = PathUtilsWrapper.split(
    DirectoryServiceWrapper.profileChromeDir,
  );
  return PathUtilsWrapper.join(rootParts.concat(relativePath.split("/")));
}

// Before the change above, persistent data resolved under fx-autoconfig's
// chrome://userchrome/content/ alias (<profile>/chrome/resources/) instead
// of the profile's chrome/ directory directly. Anyone updating across that
// change has their existing data stranded at the old location - the addon
// otherwise just sees no file there and starts over with nothing. A loader
// that never registered that alias (e.g. a fresh Sine-only install) has
// nothing to migrate, which is not an error.
/**
 *
 * @param {string} relativePath
 * @returns {string | null}
 */
function makeLegacyDataPath(relativePath) {
  try {
    const contentDir = ChromeRegistry.convertChromeURL(
      "chrome://userchrome/content/",
    );
    const resourcePath = contentDir.QueryInterface(Ci.nsIFileURL).file.parent
      .path;
    const rootParts = PathUtilsWrapper.split(resourcePath);
    return PathUtilsWrapper.join(rootParts.concat(relativePath.split("/")));
  } catch {
    return null;
  }
}

/**
 * Moves a persistent-data file forward from its pre-7a5dc5d location if one
 * exists there and nothing has been written to the current location yet.
 * A no-op once the current location has a file, so this only ever runs
 * once per profile.
 *
 * @param {string} relativePath
 */
export async function migrateLegacyFile(relativePath) {
  if (await fileExists(relativePath)) {
    return;
  }
  const legacyPath = makeLegacyDataPath(relativePath);
  if (!legacyPath || !(await IOUtilsWrapper.exists(legacyPath))) {
    return;
  }
  const data = await IOUtilsWrapper.readUTF8(legacyPath);
  await writeFile(relativePath, data);
  await IOUtilsWrapper.remove(legacyPath);
}

// A patched-module file (see patchers/*.mjs) is transient: written, then
// immediately dynamically imported back in, then deleted - every browser
// startup regenerates it, so unlike the persistent data above it doesn't
// need to survive a mod-folder wipe. Writing and importing it from
// alongside this addon's own already-loading files (resolved from this
// module's own URL, whatever chrome:// origin actually served it) keeps it
// on an origin dynamic import() is guaranteed to accept: a separate,
// loader-specific alias (fx-autoconfig's chrome://userchrome/content/) may
// not be registered under every loader, and a file:// fallback is blocked
// outright by the CSP some loaders (Sine) apply to dynamically imported
// scripts ("script-src chrome: resource: moz-src:" - no file:).
const SECOND_SIDEBAR_ROOT_URL = new URL("../", import.meta.url).href;

/**
 * Fetches the first of `urls` that loads (e.g. a Firefox module that moved
 * between versions), without logging an error for the ones that don't.
 *
 * @param {Array<string>} urls
 * @returns {Promise<string>}
 */
export async function fetchFirstAvailable(urls) {
  const failures = [];
  for (const url of urls) {
    try {
      const response = await fetch(url);
      return await response.text();
    } catch (error) {
      failures.push(`${url}: ${error.message}`);
    }
  }
  throw new Error(`Could not load any of: ${failures.join("; ")}`);
}

/**
 * Writes `data` as a temporary module next to this addon's own files,
 * imports it and deletes the file again. Every window runs the patchers, so
 * each call gets its own file name: with a shared name, one window (e.g. of
 * several restored at startup) could delete the file while another is
 * still importing it.
 *
 * @param {string} relativePath e.g. "fss/CustomizeMode.sys.mjs"; a unique
 *   suffix is added before the extension
 * @param {string} data
 * @returns {Promise<object>} the imported module namespace
 */
export async function importPatchedModule(relativePath, data) {
  const uniquePath = makeUniquePath(relativePath);
  const path = makeSelfPath(uniquePath);
  await IOUtilsWrapper.writeUTF8(path, data);
  try {
    return await import(new URL(uniquePath, SECOND_SIDEBAR_ROOT_URL).href);
  } finally {
    await IOUtilsWrapper.remove(path).catch((error) =>
      console.error(`Failed to remove temporary module "${path}":`, error),
    );
  }
}

/**
 * "fss/CustomizeMode.sys.mjs" -> "fss/CustomizeMode.1a2b3c4d.sys.mjs"
 *
 * @param {string} relativePath
 * @returns {string}
 */
function makeUniquePath(relativePath) {
  const nameStart = relativePath.lastIndexOf("/") + 1;
  const extensionStart = relativePath.indexOf(".", nameStart);
  const id = crypto.randomUUID().slice(0, 8);
  return extensionStart === -1
    ? `${relativePath}.${id}`
    : `${relativePath.slice(0, extensionStart)}.${id}${relativePath.slice(extensionStart)}`;
}

/**
 *
 * @param {string} relativePath
 * @returns {string}
 */
function makeSelfPath(relativePath) {
  const rootFile = ChromeRegistry.convertChromeURL(
    SECOND_SIDEBAR_ROOT_URL,
  ).QueryInterface(Ci.nsIFileURL).file;
  const rootParts = PathUtilsWrapper.split(rootFile.path);
  return PathUtilsWrapper.join(rootParts.concat(relativePath.split("/")));
}
