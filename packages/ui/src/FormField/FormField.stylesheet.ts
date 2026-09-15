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
 * `@tandiko/tokens` doesn't define a danger colour or a label/hint type scale — every such
 * `var()` read carries a fallback (same convention as `Button.stylesheet.ts`'s
 * `--tandiko-danger` reads and `Typography.stylesheet.ts`'s type-scale reads).
 */
export const formFieldStylesheet = `
.tandiko-form-field {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.tandiko-form-field-label {
  font-size: var(--tandiko-typography-body-sm-size, 0.875rem);
  font-weight: 500;
  color: var(--tandiko-ink);
}

.tandiko-form-field-hint {
  font-size: var(--tandiko-typography-caption-size, 0.75rem);
  color: var(--tandiko-ink-muted);
}

.tandiko-form-field-error {
  font-size: var(--tandiko-typography-caption-size, 0.75rem);
  color: var(--tandiko-danger, oklch(0.55 0.21 27));
}
`;
