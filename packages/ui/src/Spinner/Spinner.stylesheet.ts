/**
 * `<Spinner>`'s own styles, injected as an inline `<style>` rather than a `.css` import so the
 * package can stay `"sideEffects": false` (same approach as `@tandiko/tokens`'s base stylesheet
 * and `@tandiko/icons`'s icon stylesheet).
 *
 * Every `--tandiko-*` property this component depends on is *read* here through `var()` and
 * never assigned inline by the component: an inline style declaration always wins over a
 * stylesheet rule for the same property on the same element, so an inline `--tandiko-accent`
 * would permanently shadow the dark-mode reassignment in `@tandiko/tokens`'s base stylesheet.
 *
 * `@tandiko/tokens` doesn't define `--tandiko-spinner-size-*` — the fallback values keep the
 * size classes useful standalone until a later slice adds them.
 */
export const spinnerStylesheet = `
@keyframes tandiko-spinner-rotate {
  to { transform: rotate(360deg); }
}

.tandiko-spinner {
  display: inline-block;
  flex: none;
  vertical-align: middle;
  /* The track's stroke is \`currentColor\`, so this one declaration colours the whole spinner
     and a caller's \`color\` prop overrides it inline without touching any theme property. */
  color: var(--tandiko-accent);
  animation: tandiko-spinner-rotate 0.7s linear infinite;
}

.tandiko-spinner circle {
  fill: none;
  stroke: currentColor;
  stroke-width: 3;
  stroke-linecap: round;
  /* Circumference of r=10 is ~62.8; a 44/62.8 dash leaves the gap that makes the rotation
     readable. Without the gap the ring is closed and spinning it looks static. */
  stroke-dasharray: 44 62.8;
}

.tandiko-spinner-sm {
  width: var(--tandiko-spinner-size-sm, 1rem);
  height: var(--tandiko-spinner-size-sm, 1rem);
}

.tandiko-spinner-md {
  width: var(--tandiko-spinner-size-md, 1.25rem);
  height: var(--tandiko-spinner-size-md, 1.25rem);
}

.tandiko-spinner-lg {
  width: var(--tandiko-spinner-size-lg, 1.75rem);
  height: var(--tandiko-spinner-size-lg, 1.75rem);
}

@media (prefers-reduced-motion: reduce) {
  /* Slowed, not stopped: a spinner that doesn't move reports nothing about the wait it exists
     to report. */
  .tandiko-spinner {
    animation-duration: 2.4s;
  }
}
`;
