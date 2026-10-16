/**
 * `<Sparkline>`'s own styles, injected as an inline `<style>` rather than a `.css` import so the
 * package can stay `"sideEffects": false`.
 *
 * Every `--vpg-*` property is *read* here through `var()` and never assigned inline by the
 * component: an inline declaration always wins over a stylesheet rule for the same property on the
 * same element, so an inline tone colour would shadow the colour-mode reassignment in
 * `@vipengele/react-tokens`'s base stylesheet and the sparkline would stop adapting to colour mode.
 * Each tone class sets `color`, and the stroke, the area wash and the dots all read it through
 * `currentColor`, so one colour drives the whole drawing.
 *
 * The svg stretches its viewBox to the box with `preserveAspectRatio="none"`. The line carries
 * `vector-effect: non-scaling-stroke`, so the stroke stays 1.5px at any width and height instead
 * of thickening and thinning with the stretch. The end point and any point isolated between gaps
 * are absolutely positioned elements placed by percentage rather than svg circles, because a
 * circle under `preserveAspectRatio="none"` stretches into an ellipse.
 *
 * The wrapper is `position: relative` so the dots place against it, and never clips: a dot centred
 * on a point at the left or right edge, or at the top or bottom of a short sparkline whose padding
 * is narrower than the dot's radius, spills over the wrapper's edge and stays whole.
 *
 * `--vpg-warning` falls under the contrast a text glyph needs against a light surface (ADR-0033).
 * The warning sparkline stays legible through its stroke, wash and dot, which are graphical marks
 * with a lower contrast threshold, and its trend is carried by the accessible name, never by colour
 * alone.
 */
export const sparklineStylesheet = `
.vpg-sparkline {
  display: block;
  position: relative;
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  overflow: visible;
}

.vpg-sparkline-neutral {
  color: var(--vpg-ink-muted);
}

.vpg-sparkline-success {
  color: var(--vpg-success);
}

.vpg-sparkline-warning {
  color: var(--vpg-warning);
}

.vpg-sparkline-info {
  color: var(--vpg-info);
}

.vpg-sparkline-danger {
  color: var(--vpg-danger);
}

.vpg-sparkline-svg {
  display: block;
  overflow: visible;
}

.vpg-sparkline-line {
  fill: none;
  stroke: currentColor;
  stroke-width: 1.5px;
  stroke-linecap: round;
  stroke-linejoin: round;
  vector-effect: non-scaling-stroke;
}

.vpg-sparkline-area {
  fill: currentColor;
  fill-opacity: 0.12;
  stroke: none;
}

.vpg-sparkline-dot {
  position: absolute;
  box-sizing: border-box;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background-color: currentColor;
  transform: translate(-50%, -50%);
  pointer-events: none;
}

.vpg-sparkline-dot-end {
  width: 6px;
  height: 6px;
}
`;
