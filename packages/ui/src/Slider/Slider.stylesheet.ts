/**
 * `<Slider>`'s own styles, injected as an inline `<style>` rather than a `.css` import so the
 * package can stay `"sideEffects": false` (same approach as `Toggle.stylesheet.ts`).
 *
 * Every `--tandiko-*` property is *read* here through `var()` and never assigned inline by the
 * component: an inline style declaration always wins over a stylesheet rule for the same
 * property on the same element, so an inline theme property would permanently shadow
 * `@tandiko/tokens`' dark-mode reassignment and this slider would stop adapting to colour mode.
 *
 * The track/thumb appearance has no dedicated token in `@tandiko/tokens`, so every
 * `--tandiko-slider-*` read carries a fallback. `-webkit-` and `-moz-` pseudo-elements can't be
 * grouped in one selector — an invalid selector in a comma-separated list drops the whole rule
 * in some engines — so track and thumb styling is duplicated per vendor prefix.
 */
export const sliderStylesheet = `
.tandiko-slider {
  appearance: none;
  -webkit-appearance: none;
  box-sizing: border-box;
  display: block;
  width: 100%;
  margin: 0;
  padding: 0;
  background: transparent;
  cursor: pointer;
}

.tandiko-slider::-webkit-slider-runnable-track {
  box-sizing: border-box;
  width: 100%;
  height: var(--tandiko-slider-track-height, 0.25rem);
  border-radius: var(--tandiko-radius-full);
  background-color: var(--tandiko-surface-sunken);
  border: 1px solid var(--tandiko-border);
}

.tandiko-slider::-moz-range-track {
  box-sizing: border-box;
  width: 100%;
  height: var(--tandiko-slider-track-height, 0.25rem);
  border-radius: var(--tandiko-radius-full);
  background-color: var(--tandiko-surface-sunken);
  border: 1px solid var(--tandiko-border);
}

.tandiko-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  box-sizing: border-box;
  width: var(--tandiko-slider-thumb-size, 1rem);
  height: var(--tandiko-slider-thumb-size, 1rem);
  margin-top: calc(
    (var(--tandiko-slider-track-height, 0.25rem) - var(--tandiko-slider-thumb-size, 1rem)) / 2
  );
  border-radius: var(--tandiko-radius-full);
  border: 1px solid var(--tandiko-accent);
  background-color: var(--tandiko-accent);
  cursor: pointer;
  transition: background-color 120ms ease, border-color 120ms ease;
}

.tandiko-slider::-moz-range-thumb {
  box-sizing: border-box;
  width: var(--tandiko-slider-thumb-size, 1rem);
  height: var(--tandiko-slider-thumb-size, 1rem);
  border-radius: var(--tandiko-radius-full);
  border: 1px solid var(--tandiko-accent);
  background-color: var(--tandiko-accent);
  cursor: pointer;
  transition: background-color 120ms ease, border-color 120ms ease;
}

.tandiko-slider:focus-visible::-webkit-slider-thumb {
  outline: 2px solid var(--tandiko-accent-ring);
  outline-offset: 2px;
}

.tandiko-slider:focus-visible::-moz-range-thumb {
  outline: 2px solid var(--tandiko-accent-ring);
  outline-offset: 2px;
}

.tandiko-slider:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.tandiko-slider:disabled::-webkit-slider-thumb {
  cursor: not-allowed;
}

.tandiko-slider:disabled::-moz-range-thumb {
  cursor: not-allowed;
}
`;
