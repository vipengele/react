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
 *
 * The selection column is as wide as its control, plus the density padding every cell takes,
 * and centres it. A selected row's cells sit on the accent wash; the checked control beside them
 * carries the same state without relying on colour.
 *
 * With `resizableColumns` the scroll container carries `vpg-data-table-fixed` and, inline,
 * `--vpg-data-table-columns-width`, the data columns' drawn widths summed as a pixel length. The
 * table lays out fixed, so each column takes the inline width of its header cell, which counts its
 * padding and border (`border-box`); the selection column keeps its control-wide width plus the
 * density padding. A fixed layout needs a definite table width, and the browser shares whatever
 * width the table has beyond its columns among all of them, the selection column included. The
 * table's width is therefore the data columns' sum alone, never `100%`: a fixed table grows to the
 * sum of all its columns, so the selection column adds its own width and no surplus is ever left
 * to share. Once the container is measured, the drawn widths fill it when the column sizes fall
 * short of it and a column without an exact width is left to take the difference; when every
 * column is exact the table stays as wide as their sum, and when they exceed it the table
 * overflows and the container scrolls. Before that, as in server-rendered markup, the table is as
 * wide as the column sizes. A fixed column
 * never grows to its content, so a cell wraps long words anywhere and clips what still does not
 * fit.
 *
 * A resizable column's header cell is the containing block of its resize handle, a strip as wide
 * as `--vpg-space-2` along the cell's trailing edge, full height, laid over the end of the sort
 * button's padding. It sits inside the cell, so the cell's clipping never cuts it, and its edge is
 * logical, so it trails the column in either reading direction. A hairline in the border colour
 * marks the edge at rest; hovering, pressing or dragging the handle widens it to the focus ring's
 * width in the accent colour, and keyboard focus draws the focus ring inside the handle's edge. The
 * handle takes no touch gesture of its own and selects no text, so a drag resizes instead of
 * scrolling or selecting.
 *
 * The empty-state cell spans the table; its content is centred and muted, with block padding
 * larger than a row's.
 */
export const dataTableStylesheet = `
.vpg-data-table .vpg-table-body .vpg-table-cell {
  font-variant-numeric: tabular-nums;
}

.vpg-data-table .vpg-table-header-cell.vpg-data-table-sortable {
  padding: 0;
}

.vpg-data-table .vpg-data-table-select {
  inline-size: var(--vpg-icon-md);
  text-align: center;
}

.vpg-data-table-fixed > .vpg-table {
  table-layout: fixed;
  inline-size: var(--vpg-data-table-columns-width);
}

.vpg-data-table-fixed :is(.vpg-table-header-cell, .vpg-table-cell):not(.vpg-data-table-select) {
  overflow: hidden;
  overflow-wrap: anywhere;
}

.vpg-data-table-fixed .vpg-table-head .vpg-table-header-cell:not(.vpg-data-table-select) {
  box-sizing: border-box;
}

.vpg-data-table .vpg-table-header-cell.vpg-data-table-resizable {
  position: relative;
}

.vpg-data-table-resize-handle {
  position: absolute;
  inset-block: 0;
  inset-inline-end: 0;
  inline-size: var(--vpg-space-2);
  cursor: col-resize;
  touch-action: none;
  user-select: none;
}

.vpg-data-table-resize-handle::after {
  content: "";
  position: absolute;
  inset-block: 0;
  inset-inline-end: 0;
  inline-size: 1px;
  background-color: var(--vpg-border);
  transition: background-color var(--vpg-duration-fast) var(--vpg-ease-standard);
}

.vpg-data-table-resize-handle:is(:hover, :active)::after {
  inline-size: var(--vpg-focus-ring-width);
  background-color: var(--vpg-accent);
}

.vpg-data-table-resize-handle:focus-visible {
  outline: var(--vpg-focus-ring-width) solid var(--vpg-accent-ring);
  outline-offset: calc(-1 * var(--vpg-focus-ring-width));
}

.vpg-data-table .vpg-data-table-row-selected > .vpg-table-cell {
  background-color: var(--vpg-accent-wash);
}

.vpg-data-table .vpg-table-body .vpg-data-table-empty {
  padding-block: var(--vpg-space-6);
  color: var(--vpg-ink-muted);
  text-align: center;
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
