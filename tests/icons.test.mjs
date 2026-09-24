import "./gecko_stubs.mjs";

import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";

// Only these URLs "load" as images; anything else fires onerror.
const loadable = new Set();
// Page URL -> favicon URL stored in Places.
const favicons = new Map();

globalThis.Image = class {
  onload = null;
  onerror = null;
  set src(url) {
    setTimeout(() => (loadable.has(url) ? this.onload : this.onerror)?.(), 0);
  }
};
globalThis.NetUtil = {
  newURI(url) {
    const parsed = new URL(url);
    return { specIgnoringRef: url.split("#")[0], host: parsed.host };
  },
};
globalThis.Favicons = {
  setDefaultIconURIPreferredSize() {},
  async getFaviconForPage(uri) {
    const spec = favicons.get(uri.specIgnoringRef);
    return spec ? { uri: { spec } } : null;
  },
};
Services.prefs ??= { prefHasUserValue: () => false };

const { FALLBACK_ICON, fetchIconURL, firstLoadableIcon } =
  await import("../src/second_sidebar/utils/icons.mjs");

const PAGE = "https://www.instagram.com/";
const ICON = "https://static.cdninstagram.com/favicon.png";
const LOCAL = `cached-favicon:${ICON}`;
const GOOGLE =
  "https://www.google.com/s2/favicons?domain=www.instagram.com&sz=32";

beforeEach(() => {
  loadable.clear();
  favicons.clear();
});

test("uses the copy of the favicon stored in Places first", async () => {
  favicons.set(PAGE, ICON);
  loadable.add(LOCAL).add(ICON).add(GOOGLE);
  assert.equal(await fetchIconURL(PAGE), LOCAL);
});

test("falls back to the favicon's own URL, then Google, then the default", async () => {
  favicons.set(PAGE, ICON);
  loadable.add(ICON).add(GOOGLE);
  assert.equal(await fetchIconURL(PAGE), ICON);

  loadable.delete(ICON);
  assert.equal(await fetchIconURL(PAGE), GOOGLE);

  loadable.delete(GOOGLE);
  assert.equal(await fetchIconURL(PAGE), FALLBACK_ICON);
});

test("asks Google when Places has no favicon for the page", async () => {
  loadable.add(GOOGLE);
  assert.equal(await fetchIconURL(PAGE), GOOGLE);
});

test("local: false skips the profile-local cached-favicon: copy", async () => {
  favicons.set(PAGE, ICON);
  loadable.add(LOCAL).add(ICON);
  assert.equal(await fetchIconURL(PAGE, { local: false }), ICON);
});

test("predefined and host-less pages don't need a lookup", async () => {
  assert.equal(
    await fetchIconURL("about:config"),
    "chrome://global/skin/icons/settings.svg",
  );
  assert.equal(await fetchIconURL("about:robots"), FALLBACK_ICON);
  assert.equal(await fetchIconURL("not a url"), FALLBACK_ICON);
});

test("firstLoadableIcon skips empty and broken entries", async () => {
  loadable.add("chrome://ok.svg");
  assert.equal(
    await firstLoadableIcon(["", null, "https://broken", "chrome://ok.svg"]),
    "chrome://ok.svg",
  );
  assert.equal(await firstLoadableIcon([""]), FALLBACK_ICON);
});
