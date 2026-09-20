/**
 * `<Toggle>`'s own styles, injected as an inline `<style>` rather than a `.css` import so the
 * package can stay `"sideEffects": false` (same approach as `Button.stylesheet.ts`).
 *
 * Every `--vpg-*` property is *read* here through `var()` and never assigned inline by the
 * component: an inline style declaration always wins over a stylesheet rule for the same
 * property on the same element, so an inline theme property would permanently shadow
 * `@vipengele/react-tokens`' dark-mode reassignment and this toggle would stop adapting to colour mode.
 *
 * The track is a glyph rather than a pointer target — the label row around it is what a pointer
 * aims at — so its height and thumb take steps of the icon scale rather than of the size scale.
 * The thumb takes the accent's contrast colour: the thumb sits on the accent once the switch is
 * on, and a near-white thumb is invisible on a light accent.
 */
export const toggleStylesheet = `
.vpg-toggle {
  appearance: none;
  -webkit-appearance: none;
  box-sizing: border-box;
  display: inline-block;
  flex: none;
  /* A ratio of the track's own height: the width is a function of thumb travel, so binding it to
     a control-height step would restretch every switch when that step moves. */
  width: calc(var(--vpg-icon-lg) * 1.8);
  height: var(--vpg-icon-lg);
  margin: 0;
  padding: 0;
  border: 1px solid var(--vpg-border);
  border-radius: var(--vpg-radius-full);
  background-color: var(--vpg-surface-sunken);
  cursor: pointer;
  transition: background-color 120ms ease, border-color 120ms ease;
}

.vpg-toggle::before {
  content: "";
  display: block;
  box-sizing: border-box;
  width: var(--vpg-icon-sm);
  height: var(--vpg-icon-sm);
  margin: 1px;
  border-radius: var(--vpg-radius-full);
  background-color: var(--vpg-surface-raised);
  transform: translateX(0);
  transition: transform 120ms ease, background-color 120ms ease;
}

.vpg-toggle:checked {
  background-color: var(--vpg-accent);
  border-color: var(--vpg-accent);
}

.vpg-toggle:checked::before {
  background-color: var(--vpg-accent-contrast);
  transform: translateX(calc(var(--vpg-icon-lg) * 1.8 - var(--vpg-icon-sm) - 4px));
}

.vpg-toggle:focus-visible {
  outline: var(--vpg-focus-ring-width) solid var(--vpg-accent-ring);
  outline-offset: var(--vpg-focus-ring-offset);
}

.vpg-toggle:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}
`;
