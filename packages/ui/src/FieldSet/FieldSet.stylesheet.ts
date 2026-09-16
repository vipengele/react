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
 * Reads the same raised-surface tokens as `Card` — `--tandiko-surface-raised`,
 * `--tandiko-border`, `--tandiko-radius` — so a group of fields reads as the same material as a
 * card, rather than as bare unstyled markup. `@tandiko/tokens` doesn't define a legend type
 * scale, so that `var()` read carries a fallback (same convention as `FormField.stylesheet.ts`'s
 * label/hint reads).
 */
export const fieldSetStylesheet = `
.tandiko-fieldset {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  box-sizing: border-box;
  margin: 0;
  padding: 1.25rem;
  background-color: var(--tandiko-surface-raised);
  border: 1px solid var(--tandiko-border);
  border-radius: var(--tandiko-radius);
}

.tandiko-fieldset:disabled {
  opacity: 0.55;
}

.tandiko-fieldset-legend {
  padding: 0;
  margin: 0 0 -0.25rem;
  font-size: var(--tandiko-typography-body-sm-size, 0.875rem);
  font-weight: 600;
  color: var(--tandiko-ink);
}
`;
