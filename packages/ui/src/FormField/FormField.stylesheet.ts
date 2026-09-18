/**
 * `<FormField>`'s own styles, injected as an inline `<style>` rather than a `.css` import so the
 * package can stay `"sideEffects": false` (same approach as `Card`'s and `Toggle`'s
 * stylesheets).
 *
 * Every `--tandiko-*` property is *read* here through `var()` and never assigned inline by the
 * component: an inline style declaration always wins over a stylesheet rule for the same
 * property on the same element, so an inline theme property would permanently shadow
 * `@tandiko/tokens`'s dark-mode reassignment and this field would stop adapting to colour mode.
 *
 * The label, help and error text take steps of the type scale, and the error its colour from the
 * danger family — the same mode-resolved red `Button`'s danger variant and an invalid field's
 * border read.
 */
export const formFieldStylesheet = `
.tandiko-form-field {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.tandiko-form-field-label {
  font-size: var(--tandiko-font-size-sm);
  font-weight: 500;
  color: var(--tandiko-ink);
}

.tandiko-form-field-hint {
  font-size: var(--tandiko-font-size-xs);
  color: var(--tandiko-ink-muted);
}

.tandiko-form-field-error {
  font-size: var(--tandiko-font-size-xs);
  color: var(--tandiko-danger);
}
`;
