/**
 * `<Tree>`'s own styles, injected as an inline `<style>` rather than a `.css` import so the
 * package can stay `"sideEffects": false` (same approach as `Tabs`' and `Card`'s stylesheets).
 *
 * Every `--vpg-*` property is *read* here through `var()` and never assigned inline by the
 * component: an inline style declaration always wins over a stylesheet rule for the same property
 * on the same element, so an inline `--vpg-surface-hover` would permanently shadow the dark-mode
 * reassignment in `@vipengele/react-tokens`'s base stylesheet and the tree would stop adapting to
 * colour mode. A row's indentation is the one inline style, a plain `padding-inline-start` that
 * reads the spacing scale.
 *
 * Rows are the elements a consumer's `renderItem` spreads `getItemProps()` on, so these rules
 * reach them by class and by the `aria-*` state the tree sets, never by element type.
 */
export const treeStylesheet = `
.vpg-tree {
  display: flex;
  flex-direction: column;
  color: var(--vpg-ink);
  font-family: var(--vpg-font-sans);
  font-size: var(--vpg-font-size-sm);
  line-height: 1.5;
}

.vpg-tree-item {
  display: flex;
  align-items: center;
  gap: var(--vpg-space-2);
  box-sizing: border-box;
  /* A row's height is a token read, held by min-height and centred content, so it stays at the
     control scale's md step whatever a row's label or icon adds up to. */
  min-height: var(--vpg-size-md);
  padding-inline-end: var(--vpg-space-2);
  border-radius: var(--vpg-radius-sm);
  cursor: pointer;
  transition: background-color var(--vpg-duration-fast) var(--vpg-ease-standard);
  user-select: none;
}

.vpg-tree-item:hover:not([aria-disabled="true"]) {
  background-color: var(--vpg-surface-hover);
}

.vpg-tree-item:focus-visible {
  /* Inset, so adjacent rows never cover each other's ring. */
  outline: var(--vpg-focus-ring-width) solid var(--vpg-accent-ring);
  outline-offset: calc(var(--vpg-focus-ring-offset) * -1);
}

/* Selection reads on the background and the text colour together, so it survives in a
   rendering that drops either one. */
.vpg-tree-item[aria-selected="true"] {
  background-color: var(--vpg-accent-wash);
  color: var(--vpg-accent);
}

.vpg-tree-item[aria-disabled="true"] {
  color: var(--vpg-ink-subtle);
  cursor: default;
}
`;
