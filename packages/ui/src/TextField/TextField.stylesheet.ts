/**
 * `<TextField>`'s own styles, injected as an inline `<style>` rather than a `.css` import so the
 * package can stay `"sideEffects": false` (same approach as every other component's stylesheet).
 *
 * Every `--tandiko-*` property is *read* here through `var()` and never assigned inline by the
 * component: an inline style declaration always wins over a stylesheet rule for the same
 * property on the same element, so an inline `--tandiko-surface` would permanently shadow
 * `@tandiko/tokens`'s dark-mode reassignment and this field would stop adapting to colour mode.
 *
 * Reads the same border/radius/surface tokens `Dropdown`'s trigger reads, so a text field and a
 * dropdown trigger sitting side by side in a form read as the same kind of control.
 */
export const textFieldStylesheet = `
.tandiko-text-field {
  box-sizing: border-box;
  display: block;
  width: 100%;
  padding: 0.5rem 0.75rem;
  background-color: var(--tandiko-surface);
  border: 1px solid var(--tandiko-border-strong);
  border-radius: var(--tandiko-radius);
  color: var(--tandiko-ink);
  font-family: var(--tandiko-font-sans);
  font-size: var(--tandiko-font-size-sm);
  line-height: 1.5;
  transition: border-color 120ms ease, box-shadow 120ms ease;
}

.tandiko-text-field::placeholder {
  color: var(--tandiko-ink-subtle);
}

.tandiko-text-field:hover:not(:disabled) {
  border-color: var(--tandiko-border-strong);
  background-color: var(--tandiko-surface-hover);
}

.tandiko-text-field:focus-visible {
  outline: none;
  border-color: var(--tandiko-accent);
  box-shadow: 0 0 0 var(--tandiko-focus-ring-width) var(--tandiko-accent-ring);
}

.tandiko-text-field[aria-invalid="true"] {
  border-color: var(--tandiko-danger);
}

.tandiko-text-field[aria-invalid="true"]:focus-visible {
  box-shadow: 0 0 0 var(--tandiko-focus-ring-width) var(--tandiko-danger-ring);
}

.tandiko-text-field:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}
`;
