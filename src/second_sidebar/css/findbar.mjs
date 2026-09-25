// Themes and mods restyle the find bar for the main window: floating it,
// stretching it over the page, or moving the content grid's findbar area into
// a side column. In a narrow web panel any of these covers half the page, so
// the panels' window pins it across the bottom of the page instead, out of the
// grid so no template can move it (it overlays the page's last few pixels
// while open). Loaded as an agent sheet (WindowWrapper#loadAgentSheet), so it
// wins over mods' `!important` rules. The main window's find bar is left to
// Zen and the user's mods.
export const WEB_PANEL_FINDBAR_CSS = `
  findbar {
    position: absolute !important;
    grid-area: auto !important;
    inset: auto 0 0 0 !important;
    justify-self: stretch !important;
    width: auto !important;
    min-width: 0 !important;
    max-width: none !important;
    height: auto !important;
    min-height: 0 !important;
    max-height: none !important;
    margin: 0 !important;
    transform: none !important;
    translate: none !important;
    scale: none !important;
    z-index: 2 !important;
  }
`;
