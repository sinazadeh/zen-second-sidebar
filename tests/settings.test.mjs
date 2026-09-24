import { DEFAULT_USER_CONTEXT_ID } from "./gecko_stubs.mjs";

import assert from "node:assert/strict";
import { test } from "node:test";

const { SidebarSettings } =
  await import("../src/second_sidebar/settings/sidebar_settings.mjs");
const { WebPanelSettings } =
  await import("../src/second_sidebar/settings/web_panel_settings.mjs");
const { WebPanelState } =
  await import("../src/second_sidebar/settings/web_panel_state.mjs");

const OFFSET = "var(--space-small)";

test("SidebarSettings fills fields missing from older saves with defaults", () => {
  const settings = new SidebarSettings({ position: "left" });
  assert.equal(settings.position, "left");
  assert.equal(settings.padding, "small");
  assert.equal(settings.autoHideSidebar, false);
  assert.equal(settings.hideToolbarAnimated, true);
});

test("SidebarSettings round-trips through toObject", () => {
  const original = new SidebarSettings({
    position: "left",
    tooltip: "title",
    autoHideSidebar: true,
    lastWebPanelShortcut: "Alt+1",
  });
  assert.deepEqual(
    new SidebarSettings(original.toObject()).toObject(),
    original.toObject(),
  );
});

test("WebPanelSettings round-trips, including nested geometry", () => {
  const original = WebPanelSettings.fromObject("right", OFFSET, {
    uuid: "a",
    url: "https://example.com/",
    title: "Example",
    pinned: true,
    zoom: 1.2,
    unloadAfterInactivity: 60000,
    reloadOnUrlChange: true,
    floatingGeometry: { anchor: "topleft", width: "420px" },
    pinnedGeometry: { width: "350px" },
  });
  const object = original.toObject();

  assert.equal(object.floatingGeometry.anchor, "topleft");
  assert.equal(object.floatingGeometry.width, "420px");
  assert.equal(object.pinnedGeometry.width, "350px");
  assert.deepEqual(
    WebPanelSettings.fromObject("right", OFFSET, object).toObject(),
    object,
  );
});

test("WebPanelSettings defaults missing fields from the sidebar position", () => {
  const settings = WebPanelSettings.fromObject("left", OFFSET, {
    uuid: "a",
    url: "https://example.com/",
  });
  assert.equal(settings.userContextId, DEFAULT_USER_CONTEXT_ID);
  assert.equal(settings.dynamicTitle, true);
  assert.equal(settings.temporary, false);
  assert.equal(settings.floatingGeometry.left, OFFSET);
  assert.equal(settings.floatingGeometry.right, "unset");
  assert.equal(settings.floatingGeometry.height, `calc(100% - ${OFFSET} * 2)`);
  assert.equal(settings.pinnedGeometry.width, "600px");
});

test("WebPanelState round-trips and defaults lastUrl", () => {
  assert.equal(WebPanelState.fromObject({ uuid: "a" }).lastUrl, null);
  const state = WebPanelState.fromObject({
    uuid: "a",
    lastUrl: "https://example.com/page",
  });
  assert.deepEqual(state.toObject(), {
    uuid: "a",
    lastUrl: "https://example.com/page",
  });
});
