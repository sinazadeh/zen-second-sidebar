// Themes and mods restyle the find bar: floating it, stretching it over the
// page, or moving the content grid's findbar area into a side column. Any of
// these can cover or squeeze half the page. Both sheets are loaded as agent
// sheets (WindowWrapper#loadAgentSheet), so they win over mods' `!important`
// rules.

// Web panels: pinned across the bottom of the page, out of the grid so no
// template can move it (it overlays the page's last few pixels while open).
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

// Main window: back in its own row under the page, as in Firefox's own
// layout, so the page makes room for it rather than being covered. The row
// is found from the page's grid area, which mods leave in place, rather than
// the findbar area they move. Firefox hides the find bar with a negative
// margin, which a mod's margins would undo and leave an empty row, so a
// hidden find bar is taken out of the layout instead.
export const MAIN_WINDOW_FINDBAR_CSS = `
  .browserContainer > findbar {
    position: relative !important;
    inset: auto !important;
    grid-row: browserstack-end / span 1 !important;
    grid-column: browserstack !important;
    justify-self: stretch !important;
    align-self: stretch !important;
    width: auto !important;
    min-width: 0 !important;
    max-width: none !important;
    height: auto !important;
    min-height: var(--findbar-height) !important;
    max-height: none !important;
    transform: none !important;
    translate: none !important;
    rotate: none !important;
    scale: none !important;

    &:not([hidden]) {
      margin: 0 !important;
    }

    &[hidden] {
      position: absolute !important;
      inset: auto 0 0 0 !important;
    }
  }
`;
