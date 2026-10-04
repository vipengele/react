/**
 * `<Table>`'s own styles, injected as an inline `<style>` rather than a `.css` import so the
 * package can stay `"sideEffects": false` (same approach as `Card`'s and `Badge`'s stylesheets).
 *
 * Every `--vpg-*` property is *read* here through `var()` and never assigned inline by the
 * component: an inline style declaration always wins over a stylesheet rule for the same
 * property on the same element, so an inline `--vpg-border` would permanently shadow the
 * dark-mode reassignment in `@vipengele/react-tokens`'s base stylesheet and this table would stop
 * adapting to colour mode.
 *
 * Borders are `separate` with zero spacing rather than `collapse`: a collapsed border belongs to
 * the table, not the cell, so a sticky header row scrolls away from its own bottom rule. The
 * sticky `<thead>` paints an opaque `--vpg-surface` so body rows scrolling under it stay hidden,
 * and stacks at `--vpg-layer-sticky`, below every floating surface.
 */
export const tableStylesheet = `
.vpg-table-container {
  overflow: auto;
  max-inline-size: 100%;
}

.vpg-table-container:focus-visible {
  outline: var(--vpg-focus-ring-width) solid var(--vpg-accent-ring);
  outline-offset: var(--vpg-focus-ring-offset);
}

.vpg-table {
  inline-size: 100%;
  border-collapse: separate;
  border-spacing: 0;
  color: var(--vpg-ink);
  font-size: var(--vpg-font-size-sm);
  line-height: var(--vpg-line-height-normal);
}

.vpg-table-caption {
  caption-side: top;
  text-align: start;
  padding-block-end: var(--vpg-space-2);
  color: var(--vpg-ink-muted);
}

.vpg-table-header-cell,
.vpg-table-cell {
  border-block-end: 1px solid var(--vpg-border);
  vertical-align: middle;
}

.vpg-table-header-cell {
  font-weight: var(--vpg-font-weight-semibold);
}

.vpg-table-head .vpg-table-header-cell,
.vpg-table-head .vpg-table-cell {
  border-block-end-color: var(--vpg-border-strong);
}

.vpg-table-foot .vpg-table-header-cell,
.vpg-table-foot .vpg-table-cell {
  border-block-start: 1px solid var(--vpg-border-strong);
  border-block-end: none;
}

.vpg-table-align-start {
  text-align: start;
}

.vpg-table-align-center {
  text-align: center;
}

.vpg-table-align-end {
  text-align: end;
}

.vpg-table-density-compact :is(.vpg-table-header-cell, .vpg-table-cell) {
  padding-block: var(--vpg-space-1);
  padding-inline: var(--vpg-space-2);
}

.vpg-table-density-regular :is(.vpg-table-header-cell, .vpg-table-cell) {
  padding-block: var(--vpg-space-2);
  padding-inline: var(--vpg-space-3);
}

.vpg-table-density-relaxed :is(.vpg-table-header-cell, .vpg-table-cell) {
  padding-block: var(--vpg-space-3);
  padding-inline: var(--vpg-space-4);
}

.vpg-table-sticky-header > .vpg-table-head {
  position: sticky;
  inset-block-start: 0;
  z-index: var(--vpg-layer-sticky);
  background-color: var(--vpg-surface);
}
`;
