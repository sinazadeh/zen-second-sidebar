// Checks that the Firefox code this addon patches still looks the way the
// patches expect, by running them against current Firefox sources. Run
// weekly by .github/workflows/patch-targets.yml, so a Firefox change that
// breaks a patch shows up before Zen ships it. Locally:
//
//   node scripts/check_patch_targets.mjs [branch...]   (default: release)
//
// Branches are those of https://github.com/mozilla-firefox/firefox (e.g.
// release, beta, main). Zen builds on Firefox release, with its own
// patches on top, so a green run is a strong hint rather than a guarantee.

import { appendFile } from "node:fs/promises";

import {
  extractToolboxEventHandlers,
  patchCustomizeModeSource,
  patchPopupNotificationsSource,
} from "../src/second_sidebar/patchers/source_patches.mjs";

const RAW_URL = "https://raw.githubusercontent.com/mozilla-firefox/firefox";

/**
 * Each target is a Firefox file plus either a source patch function (see
 * patchers/source_patches.mjs) or snippets that must be present for the
 * runtime patches in patchers/urlbar_input_patcher.mjs.
 */
const TARGETS = [
  {
    path: "browser/components/customizableui/CustomizeMode.sys.mjs",
    patch: patchCustomizeModeSource,
  },
  {
    path: "toolkit/modules/PopupNotifications.sys.mjs",
    patch: patchPopupNotificationsSource,
  },
  {
    path: "browser/base/content/navigator-toolbox.js",
    patch: extractToolboxEventHandlers,
  },
  {
    path: "browser/components/urlbar/content/UrlbarInputBase.mjs",
    requires: {
      "_afterTabSelectAndFocusChange() {":
        "UrlbarInputPatcher wraps _afterTabSelectAndFocusChange",
    },
  },
  {
    path: "browser/components/urlbar/UrlbarValueFormatter.sys.mjs",
    requires: {
      "async update() {":
        "UrlbarInputPatcher relies on update() being async (it can't throw inside removeTab)",
    },
  },
];

/**
 * @param {string} branch
 * @returns {Promise<Array<string>>} problems found
 */
async function checkBranch(branch) {
  const problems = [];
  for (const { path, patch, requires = {} } of TARGETS) {
    const response = await fetch(`${RAW_URL}/${branch}/${path}`);
    if (!response.ok) {
      problems.push(`${path}: could not fetch (HTTP ${response.status})`);
      continue;
    }
    const source = await response.text();
    for (const description of patch?.(source).unmatched ?? []) {
      problems.push(`${path}: patch no longer applies: ${description}`);
    }
    for (const [snippet, reason] of Object.entries(requires)) {
      if (!source.includes(snippet)) {
        problems.push(`${path}: missing \`${snippet}\` (${reason})`);
      }
    }
  }
  return problems;
}

const branches = process.argv.slice(2);
const summary = [];
let failed = false;
for (const branch of branches.length > 0 ? branches : ["release"]) {
  const problems = await checkBranch(branch);
  failed ||= problems.length > 0;
  const heading = `Firefox ${branch}: ${problems.length === 0 ? "all patch targets OK" : `${problems.length} problem(s)`}`;
  console.log(heading);
  for (const problem of problems) console.log(`  - ${problem}`);
  summary.push(`### ${heading}`, ...problems.map((problem) => `- ${problem}`));
}

if (process.env.GITHUB_STEP_SUMMARY) {
  await appendFile(process.env.GITHUB_STEP_SUMMARY, summary.join("\n") + "\n");
}
process.exitCode = failed ? 1 : 0;
