import assert from "node:assert/strict";
import { test } from "node:test";

import {
  applySourcePatches,
  extractToolboxEventHandlers,
  patchCustomizeModeSource,
  patchPopupNotificationsSource,
} from "../src/second_sidebar/patchers/source_patches.mjs";

test("patches apply in order and unmatched ones are reported", () => {
  const { source, unmatched } = applySourcePatches("a a b", [
    { description: "first a", search: "a", replacement: "x" },
    { description: "every b", search: "b", replacement: "y", all: true },
    { description: "missing", search: "zzz", replacement: "" },
    { description: "uses output of the first", search: /x/g, replacement: "z" },
  ]);
  assert.equal(source, "z a y");
  assert.deepEqual(unmatched, ["missing"]);
});

test("a global RegExp can be checked repeatedly without lastIndex state", () => {
  const search = /b/g;
  const patches = [{ description: "b", search, replacement: "c" }];
  assert.deepEqual(applySourcePatches("ab", patches).unmatched, []);
  assert.deepEqual(applySourcePatches("ab", patches).unmatched, []);
});

// Trimmed-down excerpts of the real Firefox files; the weekly
// patch-targets workflow checks the patches against the full, current ones.
const CUSTOMIZE_MODE = `import { CustomizableUI } from "moz-src:///browser/components/customizableui/CustomizableUI.sys.mjs";
class CustomizeMode {
  enter() {
    let place = CustomizableUI.getPlaceForItem(node);
    CustomizableUI.addListener(this);
    let browser = document.getElementById("browser");
    browser.hidden = true;
  }
  exit() {
    CustomizableUI.removeListener(this);
  }
}
`;

test("CustomizeMode patches all apply to a matching source", () => {
  const { source, unmatched } = patchCustomizeModeSource(CUSTOMIZE_MODE);
  assert.deepEqual(unmatched, []);
  assert.match(source, /let place = getPlaceForItem\(node\)/);
  assert.match(source, /browser\.hidden = false/);
  // Rewritten to window.CustomizableUI, except for removeListener and the
  // import specifier.
  assert.match(source, /window\.CustomizableUI\.addListener\(this\)/);
  assert.match(source, /^ {4}CustomizableUI\.removeListener\(this\)/m);
  assert.match(source, /customizableui\/CustomizableUI\.sys\.mjs/);
  assert.match(source, /function getPlaceForItem\(aElement\)/);
});

test("CustomizeMode patches report what no longer matches", () => {
  const { unmatched } = patchCustomizeModeSource(
    CUSTOMIZE_MODE.replace("browser.hidden = true", "browser.collapsed = true"),
  );
  assert.equal(unmatched.length, 1);
  assert.match(unmatched[0], /customize mode/);
});

test("PopupNotifications patches all apply to a matching source", () => {
  const { source, unmatched } = patchPopupNotificationsSource(`
    let isActiveBrowser = this._isActiveBrowser(browser);
    let isActiveWindow = Services.focus.activeWindow == this.window;
    if (inactive) {
        this.window.focus();
        return;
    }
`);
  assert.deepEqual(unmatched, []);
  assert.match(source, /let isActiveBrowser = true;/);
  assert.match(source, /let isActiveWindow = true;/);
  assert.doesNotMatch(source, /return;/);
});

test("toolbox event handlers are extracted as exports", () => {
  const { source, unmatched } = extractToolboxEventHandlers(`{
    function onClick(event) {
      doThing();
    }

    function onKeyPress(event) {
      doOther();
    }
}`);
  assert.deepEqual(unmatched, []);
  assert.match(source, /^export function onClick\(event\)/m);
  assert.match(source, /^export function onKeyPress\(event\)/m);
  assert.deepEqual(extractToolboxEventHandlers("nothing here").unmatched, [
    "export the toolbar event handlers",
  ]);
});
