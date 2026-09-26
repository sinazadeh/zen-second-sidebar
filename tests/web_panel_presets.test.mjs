import "./gecko_stubs.mjs";

import assert from "node:assert/strict";
import { test } from "node:test";

const policies = [];
globalThis.WebExtensionPolicy = { getActiveExtensions: () => policies };

/**
 * @param {string} id
 * @param {string} hostname
 * @param {string} name
 * @param {object} manifest
 */
function addExtension(id, hostname, name, manifest) {
  policies.push({
    id,
    name,
    extension: { manifest },
    getURL: (path) => new URL(path, `moz-extension://${hostname}/`).href,
  });
}

addExtension("{446900e4-71c2-419f-a6a7-df9c091e268b}", "uuid-bw", "Bitwarden", {
  icons: { 32: "images/icon32.png" },
  sidebar_action: { default_panel: "popup/index.html?uilocation=sidebar" },
});
addExtension("iconless@example.com", "uuid-iconless", "Iconless", {
  sidebar_action: { default_panel: "sidebar.html" },
});

const { getExtensionPresets, getWebsitePresets } =
  await import("../src/second_sidebar/utils/web_panel_presets.mjs");
const { WebPanelSettings } =
  await import("../src/second_sidebar/settings/web_panel_settings.mjs");

test("website presets only set the URL, mobile view and dynamic favicon", () => {
  const presets = getWebsitePresets();
  assert.ok(presets.length > 0);
  for (const preset of presets) {
    assert.doesNotThrow(() => new URL(preset.url), preset.name);
    assert.deepEqual(Object.keys(preset.settings).sort(), [
      "dynamicFavicon",
      "mobile",
    ]);
    assert.equal(preset.settings.dynamicFavicon, true);
  }
  assert.equal(
    new Set(presets.map((preset) => preset.id)).size,
    presets.length,
    "ids are unique",
  );
  const telegram = presets.find((preset) => preset.name === "Telegram");
  assert.equal(telegram.settings.mobile, true);
});

test("extension presets keep the extension's icon fixed", () => {
  const [bitwarden, iconless] = getExtensionPresets();
  assert.deepEqual(bitwarden, {
    id: "extension:{446900e4-71c2-419f-a6a7-df9c091e268b}",
    name: "Bitwarden",
    // Bitwarden opens straight on its vault.
    url: "moz-extension://uuid-bw/popup/index.html?uilocation=sidebar#/tabs/vault",
    iconURL: "moz-extension://uuid-bw/images/icon32.png",
    settings: {
      mobile: false,
      dynamicFavicon: false,
      faviconURL: "moz-extension://uuid-bw/images/icon32.png",
    },
  });
  // Without an icon to fix, the page's own one is still better than nothing.
  assert.equal(iconless.url, "moz-extension://uuid-iconless/sidebar.html");
  assert.deepEqual(iconless.settings, { mobile: false, dynamicFavicon: true });
});

test("settings a preset leaves out keep their defaults", () => {
  const settings = new WebPanelSettings("left", "0px", "uuid", "https://a/", {
    mobile: undefined,
    dynamicFavicon: undefined,
    faviconURL: undefined,
  });
  assert.equal(settings.mobile, false);
  assert.equal(settings.dynamicFavicon, true);
  assert.equal(settings.faviconURL, "");
});
