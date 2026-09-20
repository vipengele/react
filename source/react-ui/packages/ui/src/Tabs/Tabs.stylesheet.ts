/**
 * `<Tabs>`'s own styles, injected as an inline `<style>` rather than a `.css` import so the
 * package can stay `"sideEffects": false` (same approach as `Card`'s and `Button`'s stylesheets).
 *
 * Every `--vpg-*` property is *read* here through `var()` and never assigned inline by the
 * component: an inline style declaration always wins over a stylesheet rule for the same property
 * on the same element, so an inline `--vpg-accent` would permanently shadow the dark-mode
 * reassignment in `@vipengele/react-tokens`'s base stylesheet and these tabs would stop adapting to
 * colour mode.
 *
 * The selected indicator is a border on the tab itself, matched by a transparent border of the
 * same width on every unselected tab, so selection never shifts the row's layout.
 */
export const tabsStylesheet = `
.vpg-tabs {
  display: flex;
  flex-direction: column;
  color: var(--vpg-ink);
  font-family: var(--vpg-font-sans);
}

/* A vertical tablist sits beside its panel, not above it. */
.vpg-tabs-vertical {
  flex-direction: row;
}

.vpg-tabs-list {
  display: flex;
}

.vpg-tabs-list-horizontal {
  flex-direction: row;
  border-bottom: 1px solid var(--vpg-border);
}

.vpg-tabs-list-vertical {
  flex-direction: column;
  border-right: 1px solid var(--vpg-border);
}

.vpg-tabs-tab {
  appearance: none;
  background: none;
  cursor: pointer;
  box-sizing: border-box;
  padding: 0.5rem 0.75rem;
  border: none;
  color: var(--vpg-ink-muted);
  font: inherit;
  font-size: var(--vpg-font-size-sm);
  line-height: 1.5;
}

.vpg-tabs-list-horizontal .vpg-tabs-tab {
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
}

.vpg-tabs-list-vertical .vpg-tabs-tab {
  text-align: left;
  border-right: 2px solid transparent;
  margin-right: -1px;
}

.vpg-tabs-tab:hover:not(:disabled) {
  color: var(--vpg-ink);
  background-color: var(--vpg-surface-hover);
}

.vpg-tabs-tab:focus-visible {
  /* Inset so the ring stays inside the list's own border rather than straddling it. */
  outline: var(--vpg-focus-ring-width) solid var(--vpg-accent-ring);
  outline-offset: calc(var(--vpg-focus-ring-offset) * -1);
}

.vpg-tabs-tab:disabled {
  cursor: not-allowed;
  color: var(--vpg-ink-subtle);
}

.vpg-tabs-tab-selected {
  color: var(--vpg-accent);
}

/* Scoped by orientation to outweigh the transparent placeholder border above, which is itself
   orientation-scoped and would otherwise win on specificity. */
.vpg-tabs-list-horizontal .vpg-tabs-tab-selected {
  border-bottom-color: var(--vpg-accent);
}

.vpg-tabs-list-vertical .vpg-tabs-tab-selected {
  border-right-color: var(--vpg-accent);
}

.vpg-tabs-panel {
  padding: 1rem 0;
}

.vpg-tabs-vertical .vpg-tabs-panel {
  padding: 0 1rem;
}
`;
