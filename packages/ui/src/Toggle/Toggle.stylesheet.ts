/**
 * `<Toggle>`'s own styles, injected as an inline `<style>` rather than a `.css` import so the
 * package can stay `"sideEffects": false` (same approach as `Button.stylesheet.ts`).
 *
 * Every `--tandiko-*` property is *read* here through `var()` and never assigned inline by the
 * component: an inline style declaration always wins over a stylesheet rule for the same
 * property on the same element, so an inline theme property would permanently shadow
 * `@tandiko/tokens`' dark-mode reassignment and this toggle would stop adapting to colour mode.
 *
 * The track is a glyph rather than a pointer target — the label row around it is what a pointer
 * aims at — so its height and thumb take steps of the icon scale rather than of the size scale.
 * The thumb takes the accent's contrast colour: the thumb sits on the accent once the switch is
 * on, and a near-white thumb is invisible on a light accent.
 */
export const toggleStylesheet = `
.tandiko-toggle {
  appearance: none;
  -webkit-appearance: none;
  box-sizing: border-box;
  display: inline-block;
  flex: none;
  /* A ratio of the track's own height: the width is a function of thumb travel, so binding it to
     a control-height step would restretch every switch when that step moves. */
  width: calc(var(--tandiko-icon-lg) * 1.8);
  height: var(--tandiko-icon-lg);
  margin: 0;
  padding: 0;
  border: 1px solid var(--tandiko-border);
  border-radius: var(--tandiko-radius-full);
  background-color: var(--tandiko-surface-sunken);
  cursor: pointer;
  transition: background-color 120ms ease, border-color 120ms ease;
}

.tandiko-toggle::before {
  content: "";
  display: block;
  box-sizing: border-box;
  width: var(--tandiko-icon-sm);
  height: var(--tandiko-icon-sm);
  margin: 1px;
  border-radius: var(--tandiko-radius-full);
  background-color: var(--tandiko-surface-raised);
  transform: translateX(0);
  transition: transform 120ms ease, background-color 120ms ease;
}

.tandiko-toggle:checked {
  background-color: var(--tandiko-accent);
  border-color: var(--tandiko-accent);
}

.tandiko-toggle:checked::before {
  background-color: var(--tandiko-accent-contrast);
  transform: translateX(calc(var(--tandiko-icon-lg) * 1.8 - var(--tandiko-icon-sm) - 4px));
}

.tandiko-toggle:focus-visible {
  outline: var(--tandiko-focus-ring-width) solid var(--tandiko-accent-ring);
  outline-offset: var(--tandiko-focus-ring-offset);
}

.tandiko-toggle:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}
`;
