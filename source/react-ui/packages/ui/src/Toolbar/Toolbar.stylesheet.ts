/**
 * `<Toolbar>`'s own styles, injected as an inline `<style>` rather than a `.css` import so the
 * package can stay `"sideEffects": false` (same approach as `ButtonGroup`'s and `Button`'s
 * stylesheets).
 *
 * The toolbar only lays its items out. Each item keeps its own focus ring, disabled dimming and
 * chrome, so a `Button`, a `ButtonGroup` or a `MenuButton` looks the same inside a toolbar as
 * outside one.
 */
export const toolbarStylesheet = `
.vpg-toolbar {
  display: flex;
  align-items: center;
  gap: var(--vpg-space-2);
}

.vpg-toolbar-horizontal {
  flex-direction: row;
  flex-wrap: wrap;
}

/* A vertical toolbar is as wide as its widest item, and every item stretches to that width. */
.vpg-toolbar-vertical {
  flex-direction: column;
  align-items: stretch;
  inline-size: fit-content;
}
`;
