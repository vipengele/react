/**
 * `<Grid>`'s and `<GridItem>`'s one shared stylesheet, injected as an inline `<style>` rather than
 * a `.css` import so the package can stay `"sideEffects": false`.
 *
 * Every per-instance value arrives as a component-scoped `--vpg-grid-*` property the instance
 * writes inline (ADR-0019), and each rule reads its properties bare (ADR-0009). A rule only
 * applies under the class that marks the instance as writing what it reads: `.vpg-grid-columns`
 * writes `--vpg-grid-columns`, `.vpg-grid-fit` writes `--vpg-grid-min-column`, and a span class
 * is present only on a `GridItem` given that span (ADR-0022). Every `.vpg-grid` writes both gap
 * properties.
 *
 * The auto-fit rule uses `auto-fit` rather than `auto-fill` so a row with fewer items than fit
 * stretches them across the container instead of leaving empty tracks beside them, and `min(…,
 * 100%)` so a container narrower than one step shows one full-width column instead of
 * overflowing.
 */
export const gridStylesheet = `
.vpg-grid {
  display: grid;
  row-gap: var(--vpg-grid-row-gap);
  column-gap: var(--vpg-grid-column-gap);
}

.vpg-grid-columns {
  grid-template-columns: repeat(var(--vpg-grid-columns), minmax(0, 1fr));
}

.vpg-grid-fit {
  grid-template-columns: repeat(auto-fit, minmax(min(var(--vpg-grid-min-column), 100%), 1fr));
}

.vpg-grid-item-col-span {
  grid-column: span var(--vpg-grid-item-col-span);
}

.vpg-grid-item-row-span {
  grid-row: span var(--vpg-grid-item-row-span);
}
`;
