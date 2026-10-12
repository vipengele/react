/**
 * `<DataTable>`'s own styles, injected as an inline `<style>` rather than a `.css` import so the
 * package can stay `"sideEffects": false` (same approach as every other component's stylesheet).
 * The table itself is `Table`, which injects its own stylesheet; this one holds only what a data
 * table adds to it, scoped under the `vpg-data-table` class on `Table`'s scroll container.
 *
 * Body cells set `tabular-nums`, so the digits of every row take the same advance and a column
 * of numbers lines up place by place.
 */
export const dataTableStylesheet = `
.vpg-data-table .vpg-table-body .vpg-table-cell {
  font-variant-numeric: tabular-nums;
}
`;
