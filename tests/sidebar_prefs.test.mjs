import "./gecko_stubs.mjs";

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const { SidebarSettings } =
  await import("../src/second_sidebar/settings/sidebar_settings.mjs");
const { SIDEBAR_PREFS, getSidebarPref, isValidSidebarPrefValue } =
  await import("../src/second_sidebar/settings/sidebar_prefs.mjs");

const readJSON = async (path) =>
  JSON.parse(await readFile(new URL(path, import.meta.url), "utf8"));
const sinePrefs = await readJSON("../preferences.json");
const theme = await readJSON("../theme.json");

// Keyboard shortcuts need the settings popup's key capture, so they have no
// pref of their own.
const POPUP_ONLY_FIELDS = ["sidebarWidgetShortcut", "lastWebPanelShortcut"];
const defaults = new SidebarSettings({});
const controls = sinePrefs.filter((pref) => pref.type !== "separator");

test("every sidebar setting except keyboard shortcuts has a pref", () => {
  const fields = Object.keys(defaults).filter(
    (field) => !POPUP_ONLY_FIELDS.includes(field),
  );
  assert.deepEqual(
    SIDEBAR_PREFS.map((entry) => entry.field).sort(),
    fields.sort(),
  );
});

test("sidebar pref names are unique and don't reuse the addon's other prefs", () => {
  const names = SIDEBAR_PREFS.map((entry) => entry.pref);
  assert.equal(new Set(names).size, names.length);
  for (const other of [
    "second-sidebar.settings",
    "second-sidebar.debug-logging",
    "second-sidebar.fit-popups-to-window",
    "second-sidebar.web-panels",
    "second-sidebar.web-panels-state",
  ]) {
    assert.ok(!names.includes(other), other);
  }
  for (const name of names) {
    assert.ok(name.startsWith("second-sidebar."), name);
  }
});

test("theme.json points Sine at preferences.json", () => {
  assert.equal(theme.preferences, "preferences.json");
});

test("preferences.json has one control per sidebar pref", () => {
  assert.deepEqual(
    controls.map((pref) => pref.property),
    SIDEBAR_PREFS.map((entry) => entry.pref),
  );
});

test("preferences.json controls match the pref types, values and defaults", () => {
  for (const control of controls) {
    const entry = getSidebarPref(control.property);
    assert.equal(control.defaultValue, defaults[entry.field], entry.pref);
    if (entry.values) {
      assert.equal(control.type, "dropdown", entry.pref);
      assert.equal(control.placeholder, false, entry.pref);
      assert.deepEqual(
        control.options.map((option) => option.value),
        entry.values,
        entry.pref,
      );
    } else {
      assert.equal(control.type, "checkbox", entry.pref);
    }
  }
});

test("preferences.json conditions check defined prefs against valid values", () => {
  for (const control of controls) {
    for (const condition of control.conditions ?? []) {
      const { property, value } = condition.if ?? condition.not;
      const entry = getSidebarPref(property);
      assert.ok(entry, property);
      assert.ok(isValidSidebarPrefValue(entry, value), `${property}=${value}`);
    }
  }
});

test("isValidSidebarPrefValue accepts only known values of the right type", () => {
  const position = getSidebarPref("second-sidebar.position");
  assert.ok(isValidSidebarPrefValue(position, "left"));
  assert.ok(!isValidSidebarPrefValue(position, "middle"));
  assert.ok(!isValidSidebarPrefValue(position, undefined));

  const autoHide = getSidebarPref("second-sidebar.auto-hide");
  assert.ok(isValidSidebarPrefValue(autoHide, false));
  assert.ok(!isValidSidebarPrefValue(autoHide, "false"));
  assert.ok(!isValidSidebarPrefValue(autoHide, undefined));

  assert.equal(getSidebarPref("second-sidebar.settings"), undefined);
});
