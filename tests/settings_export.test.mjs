import "./gecko_stubs.mjs";

import assert from "node:assert/strict";
import { test } from "node:test";

const { EXPORT_VERSION, buildSettingsExport, parseSettingsExport } =
  await import("../src/second_sidebar/settings/settings_export.mjs");
const { SidebarSettings } =
  await import("../src/second_sidebar/settings/sidebar_settings.mjs");
const { WebPanelSettings } =
  await import("../src/second_sidebar/settings/web_panel_settings.mjs");
const { WebPanelsSettings } =
  await import("../src/second_sidebar/settings/web_panels_settings.mjs");

const OFFSET = "var(--space-small)";

function makeExport() {
  const sidebarSettings = new SidebarSettings({ position: "left" });
  const webPanelsSettings = new WebPanelsSettings([
    WebPanelSettings.fromObject("left", OFFSET, {
      uuid: "a",
      url: "https://a.example/",
      pinned: true,
    }),
    WebPanelSettings.fromObject("left", OFFSET, {
      uuid: "b",
      url: "https://b.example/",
      zoom: 0.9,
    }),
  ]);
  // Through JSON, like the real export file.
  return JSON.parse(
    JSON.stringify(buildSettingsExport(sidebarSettings, webPanelsSettings)),
  );
}

test("an export parses back to the same settings", () => {
  const data = makeExport();
  assert.equal(data.version, EXPORT_VERSION);

  const { sidebarSettings, webPanelsSettings } = parseSettingsExport(data);
  assert.deepEqual(sidebarSettings.toObject(), data.sidebarSettings);
  assert.deepEqual(
    webPanelsSettings.webPanels.map((webPanel) => webPanel.toObject()),
    data.webPanels,
  );
});

test("an export without a version (older format) is accepted", () => {
  const data = makeExport();
  delete data.version;
  assert.equal(parseSettingsExport(data).webPanelsSettings.webPanels.length, 2);
});

test("files that aren't settings exports are rejected", () => {
  for (const data of [
    null,
    [],
    "text",
    {},
    { sidebarSettings: {}, webPanels: {} },
    { sidebarSettings: [], webPanels: [] },
  ]) {
    assert.throws(() => parseSettingsExport(data), /does not look like/);
  }
});

test("exports from a newer, incompatible format are rejected", () => {
  const data = makeExport();
  data.version = EXPORT_VERSION + 1;
  assert.throws(() => parseSettingsExport(data), /newer/);
});

test("broken web panel entries are rejected", () => {
  const cases = [
    [(panels) => (panels[1] = "nope"), /#2 is not an object/],
    [(panels) => delete panels[0].uuid, /#1 has no uuid/],
    [(panels) => (panels[1].url = ""), /#2 has no url/],
    [(panels) => (panels[1].uuid = panels[0].uuid), /#2 repeats uuid a/],
  ];
  for (const [breakPanels, error] of cases) {
    const data = makeExport();
    breakPanels(data.webPanels);
    assert.throws(() => parseSettingsExport(data), error);
  }
});
