import assert from "node:assert/strict";
import { test } from "node:test";

const policies = [];
globalThis.WebExtensionPolicy = {
  getActiveExtensions: () => policies,
  getByHostname: (hostname) =>
    policies.find((policy) => policy.hostname === hostname) ?? null,
};

/**
 * @param {string} hostname
 * @param {string} name
 * @param {object} manifest
 * @returns {object} A stand-in for an extension's WebExtensionPolicy.
 */
function addExtension(hostname, name, manifest) {
  policies.push({
    id: `${name}@example.com`,
    name,
    hostname,
    extension: { manifest },
    getURL: (path) => new URL(path, `moz-extension://${hostname}/`).href,
  });
}

addExtension("uuid-bitwarden", "Bitwarden", {
  icons: {
    16: "images/icon16.png",
    32: "images/icon32.png",
    96: "images/icon96.png",
  },
  sidebar_action: {
    default_panel: "popup/index.html?uilocation=sidebar",
    default_icon: "images/icon19.png",
  },
});
addExtension("uuid-no-sidebar", "No Sidebar", {
  icons: { 48: "icon.png" },
});
addExtension("uuid-aardvark", "Aardvark", {
  sidebar_action: {
    default_panel: "/sidebar.html",
    default_icon: { 16: "small.png", 24: "medium.png" },
  },
});

const { getExtensionIconURLForPage, getExtensionSidebarPanels, pickIcon } =
  await import("../src/second_sidebar/utils/extension_panels.mjs");

test("lists extensions with a sidebar page, sorted by name", () => {
  assert.deepEqual(getExtensionSidebarPanels(), [
    {
      id: "Aardvark@example.com",
      name: "Aardvark",
      url: "moz-extension://uuid-aardvark/sidebar.html",
      baseURL: "moz-extension://uuid-aardvark/",
      iconURL: "moz-extension://uuid-aardvark/medium.png",
    },
    {
      id: "Bitwarden@example.com",
      name: "Bitwarden",
      url: "moz-extension://uuid-bitwarden/popup/index.html?uilocation=sidebar",
      baseURL: "moz-extension://uuid-bitwarden/",
      iconURL: "moz-extension://uuid-bitwarden/images/icon32.png",
    },
  ]);
});

test("pickIcon prefers the smallest icon of at least 32px", () => {
  assert.equal(pickIcon({ 16: "a", 48: "b", 32: "c", 128: "d" }), "c");
  assert.equal(pickIcon({ 16: "a", 19: "b" }), "b");
  assert.equal(pickIcon("icon.svg"), "icon.svg");
  assert.equal(pickIcon({}), null);
  assert.equal(pickIcon(undefined), null);
});

test("finds the icon of the extension serving a page", () => {
  assert.equal(
    getExtensionIconURLForPage({
      scheme: "moz-extension",
      host: "uuid-bitwarden",
    }),
    "moz-extension://uuid-bitwarden/images/icon32.png",
  );
  assert.equal(
    getExtensionIconURLForPage({ scheme: "moz-extension", host: "unknown" }),
    null,
  );
  assert.equal(
    getExtensionIconURLForPage({ scheme: "https", host: "uuid-bitwarden" }),
    null,
  );
});
