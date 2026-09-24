# Zen Second Sidebar Enhanced

> [!NOTE]
> This is a fork of [aminought/firefox-second-sidebar](https://github.com/aminought/firefox-second-sidebar), adapted for **Zen Browser** on top of Zen compatibility work from [Ezo-mas/zen-second-sidebar-fix](https://github.com/Ezo-mas/zen-second-sidebar-fix). Compared to upstream, this fork additionally provides:
>
> - Full Zen Browser layout support (vertical tabs, split view, workspaces, compact mode, and both sidebar sides) alongside standard Firefox.
> - Web panel setting: `Reload when address changes` — reloads a web panel when the main browser's active tab is switched or navigated to a different site. For example, with a Bitwarden panel this reloads its vault view as you switch tabs, so it's always showing logins for whichever site you're currently on.
> - Web panel setting: `Unload after inactivity` — automatically unloads a panel that's been in the background for a set time, without relying on Firefox's own background tab unloader (which isn't reliable for panels living in the hidden window that hosts them).
> - Sidebar setting: `Export settings` / `Import settings` — back up or restore the sidebar and all web panel settings as a single JSON file.
> - [Sine](https://github.com/CosmoCreeper/Sine) mod support (`theme.json`) alongside fx-autoconfig, so the script can be installed without manually copying files.
> - Windows GPU compositing fix so web panels don't render as a blank frame when switching.

A Zen userChrome.js script that brings a second sidebar with web panels like in Vivaldi/Edge/Floorp but better.

For a tour of the features and settings shared with upstream (web panels, containers, floating and pinned panels, shortcuts, auto-hide, and more), see the [upstream README](https://github.com/aminought/firefox-second-sidebar#readme). Changes in this fork are listed in the [changelog](CHANGELOG.md).

<img width="2200" height="2131" alt="promo-rounded" src="https://github.com/user-attachments/assets/020ee8cf-1f3d-4184-98fe-889be89d6145" />

## Installation

Pick whichever loader you already use (or prefer) — both install the exact same script.

### Sine

1. Install [Sine](https://github.com/CosmoCreeper/Sine) if you haven't already.
2. In Sine's mod manager, add a mod from a repository and enter:
   ```
   sinazadeh/zen-second-sidebar-enhanced
   ```
   Installed it earlier as `sinazadeh/zen-second-sidebar-enhanced/tree/master`? That keeps working (the default branch was renamed from `master` to `main`, and GitHub redirects the old name), but you can remove the mod and add it again with the address above to be safe; your settings are kept.
3. In `about:config`, set `sine.allow-unsafe-js` to `true`. This isn't specific to Second Sidebar: Sine only runs JavaScript automatically for mods installed from its own reviewed marketplace; anything added directly from a repository (like this, until/unless it's published there) needs this explicitly enabled, or its script is silently never loaded at all.
4. Enable `toolkit.legacyUserProfileCustomizations.stylesheets` and `dom.allow_scripts_to_close_windows` in `about:config` if not already enabled.
5. Restart the browser.

### fx-autoconfig (manual)

1. Install [fx-autoconfig](https://github.com/MrOtherGuy/fx-autoconfig).
2. Copy the contents of the `src/` directory (`second_sidebar/` and `second_sidebar.uc.mjs`) into `chrome/JS/`. Each [release](https://github.com/sinazadeh/zen-second-sidebar-enhanced/releases) also has them as a zip.
3. Enable `toolkit.legacyUserProfileCustomizations.stylesheets` and `dom.allow_scripts_to_close_windows` in `about:config`.
4. [Clear](https://github.com/MrOtherGuy/fx-autoconfig?tab=readme-ov-file#deleting-startup-cache) startup-cache.
5. Have fun!

## Settings

Right-click the sidebar and choose **Sidebar settings**. With Sine, the same settings are also on Sine's mod page: click the gear button of **Zen Second Sidebar Enhanced**. Changes there apply right away, like in the popup. Keyboard shortcuts and settings export/import are only in the popup.

## Backup

Use **Export settings** / **Import settings** (sidebar settings popup) to save or restore the sidebar and every web panel's settings as one JSON file. This covers configuration only, not per-panel state like the last-opened URL. Importing checks the file, writes its settings to disk and offers to restart the browser, which is when they take effect. Until the restart, other changes to the sidebar or web panels aren't saved, so they can't overwrite the import.

### Where your data is stored

- Sidebar settings: the `second-sidebar.settings` preference (`about:config`). Each of them except keyboard shortcuts is also copied to its own preference, such as `second-sidebar.position`, which is what Sine's settings page changes (changing one in `about:config` works too).
- Web panels and their state (e.g. last URL): `web-panels.json` and `web-panels-state.json` in the `chrome/second-sidebar-data/` folder of your profile (`about:support` → _Profile Folder_). This folder is outside the script itself, so updating or reinstalling the script keeps it.

If one of these can't be read (for example after a crash while saving), the sidebar starts with defaults and keeps a copy of the unreadable data next to it, named `*.corrupt-<date>.json` (or a `second-sidebar.settings.corrupt` preference).

## Uninstall

1. Remove the mod in Sine, or delete `second_sidebar.uc.mjs` and `second_sidebar/` from `chrome/JS/` (fx-autoconfig), then restart the browser.
2. Optionally delete your data too: the `chrome/second-sidebar-data/` folder in your profile, and any `second-sidebar.*` preferences in `about:config`.

## Demo

https://github.com/user-attachments/assets/cd79d644-ca2c-4a30-ae8e-c265f41768b6

## Troubleshooting

The Browser Console (`Ctrl+Shift+J` / `Cmd+Shift+J`) logs the sidebar's startup sequence and any errors by default. For more detail when reporting a bug (web panel lifecycle, per-setting change events, etc.), set `second-sidebar.debug-logging` to `true` in `about:config` and reproduce the issue again.

- **Installed with Sine, but the sidebar never appears and the console shows nothing about it:** check that `sine.allow-unsafe-js` is `true` in `about:config` (see [Installation](#sine)). Without it, Sine silently never loads scripts from mods added by repository.
- **It stopped working after installing Sine on another profile:** Sine and fx-autoconfig each replace a single bootstrap file shared by every profile of the same browser installation, so setting up one of them can turn off the other for all profiles. Use the same loader on every profile of that installation (for example, install Second Sidebar through Sine here too).
- **A warning says a patch "no longer applies":** a browser update changed Firefox code this script adjusts, and the related feature may misbehave. Please [open an issue](https://github.com/sinazadeh/zen-second-sidebar-enhanced/issues/new?template=bug_report.yml) with the warning and your browser version.
- **Settings popups are cut off at the bottom of the screen:** on Wayland, popups open towards whichever side of the sidebar button (or right-click) has more room, and scroll to fit. Firefox keeps popups on screen by itself elsewhere, so this is automatic only on Wayland; set `second-sidebar.fit-popups-to-window` to `true` in `about:config` to turn it on anyway, or `false` to turn it off. If the Save button is still out of reach, please report it with your OS and window manager.
