# Changelog

Notable changes to this fork. Versions match `version` in `theme.json`; a
pushed `v<version>` tag publishes a GitHub release with that version's notes
below (see `.github/workflows/release.yml`).

## [Unreleased]

### Fixed

- The find bar in a web panel still covered half the page with mods or
  `userChrome.css` that move the find bar into a column beside the page. It
  is now pinned across the bottom of the panel, whatever the page layout
  styles say.

## [1.2.6] - 2026-09-25

### Fixed

- Ctrl+T (new tab), Ctrl+Shift+T (reopen closed tab), Ctrl+L (address bar)
  and Ctrl+K (web search) pressed while a web panel has focus now act on the
  browser window instead of the panel's hidden one. In Zen, Ctrl+T in a
  panel did nothing visible, and Ctrl+Shift+T could bring back a closed
  panel's page.
- The find bar (Ctrl+F) in a web panel stays docked below the page, even
  with a theme, mod or `userChrome.css` that makes the find bar float, which
  in a panel covered half the page.

## [1.2.5] - 2026-09-24

### Fixed

- Web panel buttons no longer stay blank when a site's icon can't be loaded
  from its own server (seen with Instagram and GitHub until the panel was
  opened once). The icon stored in the browser's history is tried first,
  then the site's icon URL, Google's favicon service and finally a default
  icon, using the first that actually loads. A custom icon URL that doesn't
  load falls back to the site's own icon.

## [1.2.4] - 2026-09-24

### Added

- With Sine, the sidebar settings can also be changed from Sine's mod page
  (the gear button), not only from the sidebar's right-click menu. Keyboard
  shortcuts and settings export/import stay in the sidebar's own settings
  popup. Each setting is also its own `second-sidebar.*` preference in
  `about:config`. Restart the browser after updating for it to take effect.

## [1.2.3] - 2026-09-24

### Fixed

- With auto-hide on, moving the mouse over an open web panel showed the
  sidebar well before the pointer reached the window edge, and kept it shown
  after the pointer moved back onto the panel
  ([#10](https://github.com/sinazadeh/zen-second-sidebar-enhanced/issues/10)).

## [1.2.2] - 2026-09-24

### Fixed

- On Wayland, settings popups opened from a web panel low in the sidebar (or
  by right-clicking low on it) no longer run off the bottom of the screen:
  they open towards the side with more room and scroll to fit
  ([#6](https://github.com/sinazadeh/zen-second-sidebar-enhanced/issues/6)).
  `second-sidebar.fit-popups-to-window` turns this on (`true`) or off
  (`false`) on any platform.

## [1.2.0] - 2026-09-24

### Fixed

- Edit and settings popups are capped to the window height and scroll their
  contents, so the Save button stays visible when a web panel isn't pinned
  ([#6](https://github.com/sinazadeh/zen-second-sidebar-enhanced/issues/6)).
- Importing settings could be silently undone before the restart, because
  open windows kept saving their old settings (opening, moving or resizing a
  panel was enough). Saves are now paused in every window until the browser
  restarts, and the import offers to restart right away.
- Editing, moving or deleting a temporary web panel no longer throws errors
  in other browser windows.
- Editing a panel's CSS selector right after its URL no longer cancels the
  navigation to the new URL.
- A settings change made just before closing a window is no longer lost.
- On current Firefox, the hidden web panel window no longer retries a
  urlbar patch every 50 ms forever; the patch is skipped where Firefox no
  longer needs it and gives up after 30 seconds otherwise.
- Several windows starting at once (e.g. restoring a session) no longer
  race over the same temporary patched-module file.

### Added

- An unreadable settings or web panel data file is kept as a
  `*.corrupt-<timestamp>` copy (or a `.corrupt` pref) before defaults are
  used, instead of being overwritten on the next save.
- A browser update that breaks one of the addon's patches to Firefox code
  now logs a clear warning (with the browser version) in the Browser
  Console instead of failing silently.
- Settings import rejects files with missing or duplicate web panel ids or
  URLs, or from a newer, incompatible export format, before writing
  anything.
- Unit tests (`node --test`), a weekly check of the patches against current
  Firefox sources, a release workflow and a bug report form.

### Changed

- The "Sync upstream" workflow no longer pushes a branch or tries to open a
  PR when upstream has nothing new, skips runs while a sync PR is still
  open, and deletes its branch if the PR can't be opened.
- CI actions updated to their Node 24 versions; Prettier is pinned to the
  same version locally and in CI, and also checks JSON files.
- The default branch is now `main` (was `master`), so Sine installs with the
  plain `sinazadeh/zen-second-sidebar-enhanced`. Existing installs added as
  `.../tree/master` keep working.

## [1.1.0] - 2026-09-21

### Fixed

- A settings pref or data file that can't be parsed no longer stops the
  sidebar from loading; defaults are used instead.

## [1.0.0] - 2026-09-20

First versioned release of the fork. On top of
[aminought/firefox-second-sidebar](https://github.com/aminought/firefox-second-sidebar)
and the Zen fixes from
[Ezo-mas/zen-second-sidebar-fix](https://github.com/Ezo-mas/zen-second-sidebar-fix):

- Zen Browser layout support (vertical tabs, split view, workspaces,
  compact mode, both sidebar sides) alongside standard Firefox.
- Web panel settings: `Reload when address changes` and
  `Unload after inactivity`.
- Sidebar settings: `Export settings` / `Import settings`.
- Installation as a [Sine](https://github.com/CosmoCreeper/Sine) mod via
  `theme.json`, alongside fx-autoconfig.
- Windows GPU compositing fix for web panels rendering as a blank frame.
