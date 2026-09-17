/**
 * `<Card>`'s own styles, injected as an inline `<style>` rather than a `.css` import so the
 * package can stay `"sideEffects": false` (same approach as `Button`'s and `Avatar`'s
 * stylesheets).
 *
 * Every `--tandiko-*` property is *read* here through `var()` and never assigned inline by the
 * component: an inline style declaration always wins over a stylesheet rule for the same
 * property on the same element, so an inline `--tandiko-surface-raised` would permanently
 * shadow the dark-mode reassignment in `@tandiko/tokens`'s base stylesheet and this card would
 * stop adapting to colour mode.
 *
 * `.tandiko-card` lays its children out as a column and orders them by CSS `order` rather than
 * by DOM position, so `Card.Header`/`Card.Content`/`Card.Footer` render header-above-content-
 * above-footer regardless of the order a consumer writes them in JSX.
 */
export const cardStylesheet = `
.tandiko-card {
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  background-color: var(--tandiko-surface-raised);
  border: 1px solid var(--tandiko-border);
  border-radius: var(--tandiko-radius);
  color: var(--tandiko-ink);
}

.tandiko-card-interactive {
  cursor: pointer;
  text-align: left;
}

.tandiko-card-interactive:hover {
  background-color: var(--tandiko-surface-hover);
}

.tandiko-card-interactive:active {
  background-color: var(--tandiko-surface-press);
}

.tandiko-card-interactive:focus-visible {
  /* Offset rather than inset so the ring stays legible against a same-coloured surface. */
  outline: var(--tandiko-focus-ring-width) solid var(--tandiko-accent-ring);
  outline-offset: var(--tandiko-focus-ring-offset);
}

.tandiko-card-header {
  order: 1;
  padding: 1rem 1rem 0;
}

.tandiko-card-content {
  order: 2;
  padding: 1rem;
}

.tandiko-card-footer {
  order: 3;
  padding: 0 1rem 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
`;
