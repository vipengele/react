/**
 * `<DataTable>`'s own styles, injected as an inline `<style>` rather than a `.css` import so the
 * package can stay `"sideEffects": false` (same approach as every other component's stylesheet).
 * The table itself is `Table`, which injects its own stylesheet; this one holds only what a data
 * table adds to it, scoped under the `vpg-data-table` class on `Table`'s scroll container.
 *
 * Body cells set `tabular-nums`, so the digits of every row take the same advance and a column
 * of numbers lines up place by place.
 *
 * A sortable header's button fills its cell: the cell gives up its density padding and the
 * button takes the same padding, so the whole cell is the hit target and the hover wash covers
 * it. The button carries no chrome of its own and inherits the header's type. Its focus ring is
 * drawn inside its edge, because the scroll container clips anything drawn outside the table.
 * The rules that move the padding outrank `Table`'s density rules by specificity, whichever
 * stylesheet React inserts first.
 *
 * The indicator keeps its space while the column is unsorted, so sorting never shifts the
 * header; it shows faintly on hover and focus as the cue that the column sorts. An end-aligned
 * column lays its button out end to start, so the label stays flush with the column's values
 * and the indicator and priority sit before it.
 */
export const dataTableStylesheet = `
.vpg-data-table .vpg-table-body .vpg-table-cell {
  font-variant-numeric: tabular-nums;
}

.vpg-data-table .vpg-table-header-cell.vpg-data-table-sortable {
  padding: 0;
}

.vpg-data-table-sort {
  display: flex;
  align-items: center;
  gap: var(--vpg-space-1);
  box-sizing: border-box;
  inline-size: 100%;
  margin: 0;
  border: 0;
  border-radius: 0;
  background-color: transparent;
  color: inherit;
  font: inherit;
  letter-spacing: inherit;
  text-align: inherit;
  cursor: pointer;
  transition: background-color var(--vpg-duration-fast) var(--vpg-ease-standard);
}

.vpg-data-table .vpg-table-density-compact .vpg-data-table-sort {
  padding-block: var(--vpg-space-1);
  padding-inline: var(--vpg-space-2);
}

.vpg-data-table .vpg-table-density-regular .vpg-data-table-sort {
  padding-block: var(--vpg-space-2);
  padding-inline: var(--vpg-space-3);
}

.vpg-data-table .vpg-table-density-relaxed .vpg-data-table-sort {
  padding-block: var(--vpg-space-3);
  padding-inline: var(--vpg-space-4);
}

.vpg-table-align-center > .vpg-data-table-sort {
  justify-content: center;
}

.vpg-table-align-end > .vpg-data-table-sort {
  flex-direction: row-reverse;
  justify-content: flex-start;
}

.vpg-data-table-sort:hover {
  background-color: var(--vpg-surface-hover);
}

.vpg-data-table-sort:active {
  background-color: var(--vpg-surface-press);
}

.vpg-data-table-sort:focus-visible {
  outline: var(--vpg-focus-ring-width) solid var(--vpg-accent-ring);
  outline-offset: calc(-1 * var(--vpg-focus-ring-width));
}

.vpg-data-table-sort-label {
  min-inline-size: 0;
}

.vpg-data-table-sort-indicator {
  flex: none;
  inline-size: var(--vpg-icon-sm);
  block-size: var(--vpg-icon-sm);
  color: var(--vpg-ink-muted);
}

.vpg-data-table-sort-indicator[data-direction="none"] {
  visibility: hidden;
  color: var(--vpg-ink-subtle);
}

.vpg-data-table-sort:is(:hover, :focus-visible) .vpg-data-table-sort-indicator[data-direction="none"] {
  visibility: visible;
}

.vpg-data-table-sort-priority {
  flex: none;
  color: var(--vpg-ink-muted);
  font-size: var(--vpg-font-size-xs);
  font-variant-numeric: tabular-nums;
}

/* Keeps the sort priority in the button's accessible name without taking up visual space. */
.vpg-data-table-visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
`;
