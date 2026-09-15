/**
 * `<FieldSet>`'s own styles, injected as an inline `<style>` rather than a `.css` import so the
 * package can stay `"sideEffects": false` (same approach as `FormField`'s and `Card`'s
 * stylesheets).
 *
 * Every `--tandiko-*` property is *read* here through `var()` and never assigned inline by the
 * component: an inline style declaration always wins over a stylesheet rule for the same
 * property on the same element, so an inline theme property would permanently shadow
 * `@tandiko/tokens`'s dark-mode reassignment and this fieldset would stop adapting to colour
 * mode.
 *
 * `@tandiko/tokens` doesn't define a legend type scale, so that `var()` read carries a fallback
 * (same convention as `FormField.stylesheet.ts`'s label/hint reads).
 */
export const fieldSetStylesheet = `
.tandiko-fieldset {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin: 0;
  padding: 0;
  border: none;
}

.tandiko-fieldset-legend {
  padding: 0;
  margin-bottom: 0.375rem;
  font-size: var(--tandiko-typography-body-sm-size, 0.875rem);
  font-weight: 500;
  color: var(--tandiko-ink);
}
`;
