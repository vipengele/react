/**
 * `<Pagination>`'s own styles, injected as an inline `<style>` rather than a `.css` import so the
 * package can stay `"sideEffects": false` (same approach as every other component's stylesheet).
 * The page-size field is the composed `Dropdown`, which injects its own stylesheet; this one only
 * sizes the box that field sits in.
 *
 * Every `--vpg-*` property is *read* here through `var()` and never assigned inline by the
 * component: an inline style declaration always wins over a stylesheet rule for the same
 * property on the same element, so an inline `--vpg-accent` would permanently shadow the
 * dark-mode reassignment in `@vipengele/react-tokens`'s base stylesheet and the bar would stop
 * adapting to colour mode.
 *
 * Page buttons are square at the size scale's default control step, the same height as the
 * page-size field beside them. The current page is filled with the accent, so it reads as the
 * selected one without relying on `aria-current` being visible.
 */
export const paginationStylesheet = `
.vpg-pagination {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--vpg-space-3) var(--vpg-space-5);
  color: var(--vpg-ink);
  font-family: var(--vpg-font-sans);
  font-size: var(--vpg-font-size-sm);
  /* Digits keep one width, so the range text and the page numbers do not jitter as they change. */
  font-variant-numeric: tabular-nums;
}

.vpg-pagination-size {
  display: inline-flex;
  align-items: center;
  gap: var(--vpg-space-2);
}

.vpg-pagination-size-label {
  color: var(--vpg-ink-muted);
  white-space: nowrap;
}

/* \`Dropdown\` fills the width of its container. Scoped under \`.vpg-pagination\` so it outranks
   the dropdown's own \`width: 100%\` whichever stylesheet React inserts first. */
.vpg-pagination .vpg-pagination-size-control {
  flex: none;
  width: calc(var(--vpg-size-2xl) * 2);
}

.vpg-pagination-status {
  color: var(--vpg-ink-muted);
  white-space: nowrap;
}

/* The page list keeps to the inline end of the bar, wrapping below the rest when it runs out of
   room. */
.vpg-pagination-list {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--vpg-space-1);
  margin: 0;
  margin-inline-start: auto;
  padding: 0;
  list-style: none;
}

.vpg-pagination-item {
  display: flex;
}

.vpg-pagination-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  min-width: var(--vpg-size-md);
  min-height: var(--vpg-size-md);
  margin: 0;
  padding: 0 var(--vpg-space-2);
  border: 1px solid transparent;
  border-radius: var(--vpg-radius);
  background-color: transparent;
  color: var(--vpg-ink);
  font: inherit;
  line-height: 1;
  cursor: pointer;
  transition: background-color var(--vpg-duration-fast) var(--vpg-ease-standard),
    color var(--vpg-duration-fast) var(--vpg-ease-standard);
}

.vpg-pagination-button:hover:not(:disabled) {
  background-color: var(--vpg-surface-hover);
}

.vpg-pagination-button:active:not(:disabled) {
  background-color: var(--vpg-surface-press);
}

.vpg-pagination-button:focus-visible {
  outline: var(--vpg-focus-ring-width) solid var(--vpg-accent-ring);
  outline-offset: var(--vpg-focus-ring-offset);
}

.vpg-pagination-button:disabled {
  /* Pointer events stay on, so the cursor still says why nothing happens. */
  cursor: not-allowed;
  color: var(--vpg-ink-subtle);
}

.vpg-pagination-button[aria-current="page"] {
  background-color: var(--vpg-accent);
  color: var(--vpg-accent-contrast);
  font-weight: var(--vpg-font-weight-semibold);
}

.vpg-pagination-button[aria-current="page"]:hover {
  background-color: var(--vpg-accent-hover);
}

.vpg-pagination-icon {
  flex: none;
  width: var(--vpg-icon-sm);
  height: var(--vpg-icon-sm);
}

.vpg-pagination-ellipsis {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: var(--vpg-size-md);
  min-height: var(--vpg-size-md);
  color: var(--vpg-ink-muted);
}
`;
