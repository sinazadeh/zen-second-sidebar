import { SidebarSettings } from "./sidebar_settings.mjs";
import { WebPanelSettings } from "./web_panel_settings.mjs";
import { WebPanelsSettings } from "./web_panels_settings.mjs";

// Bump when the exported shape changes in a way old exports can't just be
// read as (a field renamed or repurposed, not just a new optional field -
// those already default fine via the settings classes' own constructors).
export const EXPORT_VERSION = 1;

/**
 * Builds the settings export file's contents: the sidebar settings and every
 * web panel's settings (not their per-panel state, e.g. lastUrl - see
 * AGENTS.md on keeping those distinct).
 *
 * @param {SidebarSettings} sidebarSettings
 * @param {WebPanelsSettings} webPanelsSettings
 * @returns {object}
 */
export function buildSettingsExport(sidebarSettings, webPanelsSettings) {
  return {
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    sidebarSettings: sidebarSettings.toObject(),
    webPanels: webPanelsSettings.webPanels.map((webPanel) =>
      webPanel.toObject(),
    ),
  };
}

/**
 * Validates a parsed settings export and turns it back into settings
 * objects. Throws an Error describing the first problem found, so a broken
 * or foreign file is rejected before anything is written.
 *
 * @param {*} data
 * @returns {{sidebarSettings: SidebarSettings, webPanelsSettings: WebPanelsSettings}}
 */
export function parseSettingsExport(data) {
  if (
    !isPlainObject(data) ||
    !isPlainObject(data.sidebarSettings) ||
    !Array.isArray(data.webPanels)
  ) {
    throw new Error("file does not look like a Second Sidebar settings export");
  }
  if (typeof data.version === "number" && data.version > EXPORT_VERSION) {
    throw new Error(
      `export format version ${data.version} is newer than this version of Second Sidebar supports (${EXPORT_VERSION})`,
    );
  }

  const uuids = new Set();
  data.webPanels.forEach((webPanel, index) => {
    const name = `web panel #${index + 1}`;
    if (!isPlainObject(webPanel)) {
      throw new Error(`${name} is not an object`);
    }
    if (typeof webPanel.uuid !== "string" || !webPanel.uuid) {
      throw new Error(`${name} has no uuid`);
    }
    if (typeof webPanel.url !== "string" || !webPanel.url) {
      throw new Error(`${name} has no url`);
    }
    if (uuids.has(webPanel.uuid)) {
      throw new Error(`${name} repeats uuid ${webPanel.uuid}`);
    }
    uuids.add(webPanel.uuid);
  });

  const sidebarSettings = new SidebarSettings(data.sidebarSettings);
  const defaultFloatingOffsetCSS = `var(--space-${sidebarSettings.defaultFloatingOffset})`;
  const webPanelsSettings = new WebPanelsSettings(
    data.webPanels.map((webPanel) =>
      WebPanelSettings.fromObject(
        sidebarSettings.position,
        defaultFloatingOffsetCSS,
        webPanel,
      ),
    ),
  );
  return { sidebarSettings, webPanelsSettings };
}

/**
 * @param {*} value
 * @returns {boolean}
 */
function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
