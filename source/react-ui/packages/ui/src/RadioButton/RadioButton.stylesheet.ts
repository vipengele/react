/**
 * `<RadioButton>`'s own styles, injected as an inline `<style>` rather than a `.css` import so
 * the package can stay `"sideEffects": false` (same approach as `Toggle.stylesheet.ts`).
 *
 * Every `--vpg-*` property is *read* here through `var()` and never assigned inline by the
 * component: an inline style declaration always wins over a stylesheet rule for the same
 * property on the same element, so an inline theme property would permanently shadow
 * `@vipengele/react-tokens`' dark-mode reassignment and this radio would stop adapting to colour mode.
 *
 * The indicator is a glyph rather than a pointer target — the label row around it is what a
 * pointer aims at — so it takes a step of the icon scale. The dot is written as a fraction of the
 * indicator so the two stay in proportion.
 */
export const radioButtonStylesheet = `
.vpg-radio-button {
  appearance: none;
  -webkit-appearance: none;
  box-sizing: border-box;
  position: relative;
  display: inline-block;
  flex: none;
  width: var(--vpg-icon-md);
  height: var(--vpg-icon-md);
  margin: 0;
  padding: 0;
  border: 1px solid var(--vpg-border);
  border-radius: var(--vpg-radius-full);
  background-color: var(--vpg-surface);
  cursor: pointer;
  transition: border-color 120ms ease;
}

.vpg-radio-button::before {
  content: "";
  position: absolute;
  inset: 0;
  margin: auto;
  width: calc(var(--vpg-icon-md) * 0.5);
  height: calc(var(--vpg-icon-md) * 0.5);
  border-radius: var(--vpg-radius-full);
  background-color: var(--vpg-accent);
  transform: scale(0);
  transition: transform 120ms ease;
}

.vpg-radio-button:checked {
  border-color: var(--vpg-accent);
}

.vpg-radio-button:checked::before {
  transform: scale(1);
}

.vpg-radio-button:focus-visible {
  outline: var(--vpg-focus-ring-width) solid var(--vpg-accent-ring);
  outline-offset: var(--vpg-focus-ring-offset);
}

.vpg-radio-button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}
`;
