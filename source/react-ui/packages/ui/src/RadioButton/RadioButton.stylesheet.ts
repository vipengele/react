/**
 * `<RadioButton>`'s own styles, injected as an inline `<style>` rather than a `.css` import so
 * the package can stay `"sideEffects": false` (same approach as `Toggle.stylesheet.ts`).
 *
 * Every `--tandiko-*` property is *read* here through `var()` and never assigned inline by the
 * component: an inline style declaration always wins over a stylesheet rule for the same
 * property on the same element, so an inline theme property would permanently shadow
 * `@tandiko/tokens`' dark-mode reassignment and this radio would stop adapting to colour mode.
 *
 * The indicator is a glyph rather than a pointer target — the label row around it is what a
 * pointer aims at — so it takes a step of the icon scale. The dot is written as a fraction of the
 * indicator so the two stay in proportion.
 */
export const radioButtonStylesheet = `
.tandiko-radio-button {
  appearance: none;
  -webkit-appearance: none;
  box-sizing: border-box;
  position: relative;
  display: inline-block;
  flex: none;
  width: var(--tandiko-icon-md);
  height: var(--tandiko-icon-md);
  margin: 0;
  padding: 0;
  border: 1px solid var(--tandiko-border);
  border-radius: var(--tandiko-radius-full);
  background-color: var(--tandiko-surface);
  cursor: pointer;
  transition: border-color 120ms ease;
}

.tandiko-radio-button::before {
  content: "";
  position: absolute;
  inset: 0;
  margin: auto;
  width: calc(var(--tandiko-icon-md) * 0.5);
  height: calc(var(--tandiko-icon-md) * 0.5);
  border-radius: var(--tandiko-radius-full);
  background-color: var(--tandiko-accent);
  transform: scale(0);
  transition: transform 120ms ease;
}

.tandiko-radio-button:checked {
  border-color: var(--tandiko-accent);
}

.tandiko-radio-button:checked::before {
  transform: scale(1);
}

.tandiko-radio-button:focus-visible {
  outline: var(--tandiko-focus-ring-width) solid var(--tandiko-accent-ring);
  outline-offset: var(--tandiko-focus-ring-offset);
}

.tandiko-radio-button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}
`;
