/**
 * `<Tag>`'s own styles, injected as an inline `<style>` rather than a `.css` import so the package
 * can stay `"sideEffects": false` (same approach as every other component's stylesheet). This
 * styles only what a tag adds to the `Badge` it composes — the remove button and the tighter
 * trailing padding around it. The mark's shape, sizes and every variant's colours come from
 * `Badge`'s stylesheet, which the composed `Badge` injects itself.
 *
 * Every `--vpg-*` property is *read* here through `var()` and never assigned inline by the
 * component: an inline style declaration always wins over a stylesheet rule for the same
 * property on the same element, so an inline `--vpg-accent-ring` would permanently shadow the
 * dark-mode reassignment in `@vipengele/react-tokens`'s base stylesheet and the button would stop
 * adapting to colour mode.
 *
 * The button inherits the badge's text colour, so its glyph and its hover wash — `currentColor`
 * mixed into transparency — follow every variant and emphasis without a rule per combination. It
 * draws its own `:focus-visible` ring and its own hover state: nothing around it styles either.
 */
export const tagStylesheet = `
.vpg-badge.vpg-tag {
  padding-inline-end: var(--vpg-space-1);
}

.vpg-tag-remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  box-sizing: content-box;
  appearance: none;
  margin: 0;
  padding: var(--vpg-space-1);
  border: none;
  border-radius: var(--vpg-radius-full);
  background: none;
  color: inherit;
  font: inherit;
  cursor: pointer;
  transition: background-color var(--vpg-duration-fast) var(--vpg-ease-standard);
}

.vpg-tag-remove:hover {
  background-color: color-mix(in srgb, currentColor 16%, transparent);
}

.vpg-tag-remove:focus-visible {
  outline: var(--vpg-focus-ring-width) solid var(--vpg-accent-ring);
  outline-offset: var(--vpg-focus-ring-offset);
}

.vpg-tag-remove-icon {
  flex: none;
  width: 100%;
  height: 100%;
}

.vpg-badge-sm .vpg-tag-remove {
  width: var(--vpg-icon-sm);
  height: var(--vpg-icon-sm);
}

.vpg-badge-md .vpg-tag-remove {
  width: var(--vpg-icon-md);
  height: var(--vpg-icon-md);
}
`;
