/**
 * `<Spinner>`'s own styles, injected as an inline `<style>` rather than a `.css` import so the
 * package can stay `"sideEffects": false` (same approach as `@vipengele/react-tokens`'s base stylesheet
 * and `@vipengele/react-icons`'s icon stylesheet).
 *
 * Every `--vpg-*` property this component depends on is *read* here through `var()` and
 * never assigned inline by the component: an inline style declaration always wins over a
 * stylesheet rule for the same property on the same element, so an inline `--vpg-accent`
 * would permanently shadow the dark-mode reassignment in `@vipengele/react-tokens`'s base stylesheet.
 *
 * A spinner is glyph-sized, so every size takes a step of the icon scale.
 */
export const spinnerStylesheet = `
@keyframes vpg-spinner-rotate {
  to { transform: rotate(360deg); }
}

.vpg-spinner {
  display: inline-block;
  flex: none;
  vertical-align: middle;
  /* The track's stroke is \`currentColor\`, so this one declaration colours the whole spinner
     and a caller's \`color\` prop overrides it inline without touching any theme property. */
  color: var(--vpg-accent);
  animation: vpg-spinner-rotate 0.7s linear infinite;
}

.vpg-spinner circle {
  fill: none;
  stroke: currentColor;
  stroke-width: 3;
  stroke-linecap: round;
  /* Circumference of r=10 is ~62.8; a 44/62.8 dash leaves the gap that makes the rotation
     readable. Without the gap the ring is closed and spinning it looks static. */
  stroke-dasharray: 44 62.8;
}

.vpg-spinner-sm {
  width: var(--vpg-icon-md);
  height: var(--vpg-icon-md);
}

.vpg-spinner-md {
  width: var(--vpg-icon-lg);
  height: var(--vpg-icon-lg);
}

.vpg-spinner-lg {
  width: var(--vpg-icon-xl);
  height: var(--vpg-icon-xl);
}

@media (prefers-reduced-motion: reduce) {
  /* Slowed, not stopped: a spinner that doesn't move reports nothing about the wait it exists
     to report. */
  .vpg-spinner {
    animation-duration: 2.4s;
  }
}
`;
