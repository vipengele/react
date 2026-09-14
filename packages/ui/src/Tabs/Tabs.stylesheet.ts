/**
 * `<Tabs>`'s own styles, injected as an inline `<style>` rather than a `.css` import so the
 * package can stay `"sideEffects": false` (same approach as `Card`'s and `Button`'s stylesheets).
 *
 * Every `--tandiko-*` property is *read* here through `var()` and never assigned inline by the
 * component: an inline style declaration always wins over a stylesheet rule for the same property
 * on the same element, so an inline `--tandiko-accent` would permanently shadow the dark-mode
 * reassignment in `@tandiko/tokens`'s base stylesheet and these tabs would stop adapting to
 * colour mode.
 *
 * The selected indicator is a border on the tab itself, matched by a transparent border of the
 * same width on every unselected tab, so selection never shifts the row's layout.
 */
export const tabsStylesheet = `
.tandiko-tabs {
  display: flex;
  flex-direction: column;
  color: var(--tandiko-ink);
  font-family: var(--tandiko-font-sans);
}

/* A vertical tablist sits beside its panel, not above it. */
.tandiko-tabs-vertical {
  flex-direction: row;
}

.tandiko-tabs-list {
  display: flex;
}

.tandiko-tabs-list-horizontal {
  flex-direction: row;
  border-bottom: 1px solid var(--tandiko-border);
}

.tandiko-tabs-list-vertical {
  flex-direction: column;
  border-right: 1px solid var(--tandiko-border);
}

.tandiko-tabs-tab {
  appearance: none;
  background: none;
  cursor: pointer;
  box-sizing: border-box;
  padding: 0.5rem 0.75rem;
  border: none;
  color: var(--tandiko-ink-muted);
  font: inherit;
  font-size: var(--tandiko-typography-body-md-size, 1rem);
  line-height: 1.5;
}

.tandiko-tabs-list-horizontal .tandiko-tabs-tab {
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
}

.tandiko-tabs-list-vertical .tandiko-tabs-tab {
  text-align: left;
  border-right: 2px solid transparent;
  margin-right: -1px;
}

.tandiko-tabs-tab:hover:not(:disabled) {
  color: var(--tandiko-ink);
  background-color: var(--tandiko-surface-hover);
}

.tandiko-tabs-tab:focus-visible {
  /* Inset so the ring stays inside the list's own border rather than straddling it. */
  outline: 2px solid var(--tandiko-accent-ring);
  outline-offset: -2px;
}

.tandiko-tabs-tab:disabled {
  cursor: not-allowed;
  color: var(--tandiko-ink-subtle);
}

.tandiko-tabs-tab-selected {
  color: var(--tandiko-accent);
}

/* Scoped by orientation to outweigh the transparent placeholder border above, which is itself
   orientation-scoped and would otherwise win on specificity. */
.tandiko-tabs-list-horizontal .tandiko-tabs-tab-selected {
  border-bottom-color: var(--tandiko-accent);
}

.tandiko-tabs-list-vertical .tandiko-tabs-tab-selected {
  border-right-color: var(--tandiko-accent);
}

.tandiko-tabs-panel {
  padding: 1rem 0;
}

.tandiko-tabs-vertical .tandiko-tabs-panel {
  padding: 0 1rem;
}
`;
