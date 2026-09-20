/**
 * `<Card>`'s own styles, injected as an inline `<style>` rather than a `.css` import so the
 * package can stay `"sideEffects": false` (same approach as `Button`'s and `Avatar`'s
 * stylesheets).
 *
 * Every `--vpg-*` property is *read* here through `var()` and never assigned inline by the
 * component: an inline style declaration always wins over a stylesheet rule for the same
 * property on the same element, so an inline `--vpg-surface-raised` would permanently
 * shadow the dark-mode reassignment in `@vipengele/react-tokens`'s base stylesheet and this card would
 * stop adapting to colour mode.
 *
 * `.vpg-card` lays its children out as a column and orders them by CSS `order` rather than
 * by DOM position, so `Card.Header`/`Card.Content`/`Card.Footer` render header-above-content-
 * above-footer regardless of the order a consumer writes them in JSX.
 */
export const cardStylesheet = `
.vpg-card {
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  background-color: var(--vpg-surface-raised);
  border: 1px solid var(--vpg-border);
  border-radius: var(--vpg-radius);
  color: var(--vpg-ink);
}

.vpg-card-interactive {
  cursor: pointer;
  text-align: left;
}

.vpg-card-interactive:hover {
  background-color: var(--vpg-surface-hover);
}

.vpg-card-interactive:active {
  background-color: var(--vpg-surface-press);
}

.vpg-card-interactive:focus-visible {
  /* Offset rather than inset so the ring stays legible against a same-coloured surface. */
  outline: var(--vpg-focus-ring-width) solid var(--vpg-accent-ring);
  outline-offset: var(--vpg-focus-ring-offset);
}

.vpg-card-header {
  order: 1;
  padding: 1rem 1rem 0;
}

.vpg-card-content {
  order: 2;
  padding: 1rem;
}

.vpg-card-footer {
  order: 3;
  padding: 0 1rem 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
`;
