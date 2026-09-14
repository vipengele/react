/**
 * `<Skeleton>`'s own styles, injected as an inline `<style>` rather than a `.css` import so the
 * package can stay `"sideEffects": false` (same approach as `Spinner`'s and `Avatar`'s
 * stylesheets).
 *
 * Every `--tandiko-*` property this component depends on is *read* here through `var()` and
 * never assigned inline by the component: an inline style declaration always wins over a
 * stylesheet rule for the same property on the same element, so an inline `--tandiko-surface-*`
 * would permanently shadow the dark-mode reassignment in `@tandiko/tokens`'s base stylesheet.
 *
 * The shimmer sweeps a gradient across the element by animating `background-position` rather
 * than `opacity`: an opacity pulse reads as the whole placeholder flashing, while a moving
 * highlight reads as light travelling across a surface, which is the effect a loading
 * placeholder is meant to suggest.
 *
 * The gradient computes its own lightness swing from `--tandiko-surface` directly, at wider
 * `--tandiko-lift`/`--tandiko-sink` multiples than `--tandiko-surface-raised`/`-hover` use —
 * rather than reading those two properties as-is. Their swing is tuned for a static hover/press
 * affordance, and reads as barely-there motion once animated against `--tandiko-surface-dark`'s
 * low base lightness, where the same absolute delta is far less perceptible than it is against
 * the light surface. Scoped to this component alone so the shared ramp (Button's secondary
 * variant, ButtonGroup's hover state, …) keeps its own tuning.
 */
export const skeletonStylesheet = `
@keyframes tandiko-skeleton-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.tandiko-skeleton {
  display: block;
  flex: none;
  box-sizing: border-box;
  background-image: linear-gradient(
    90deg,
    oklch(from var(--tandiko-surface) calc(l + var(--tandiko-lift) * 2.5) c h) 25%,
    oklch(from var(--tandiko-surface) calc(l - var(--tandiko-sink) * 1.5) c h) 50%,
    oklch(from var(--tandiko-surface) calc(l + var(--tandiko-lift) * 2.5) c h) 75%
  );
  background-size: 200% 100%;
  animation: tandiko-skeleton-shimmer 1.5s ease-in-out infinite;
}

.tandiko-skeleton-text {
  width: 100%;
  height: 1em;
  border-radius: var(--tandiko-radius-sm);
}

.tandiko-skeleton-rect {
  width: 100%;
  height: 1.25rem;
  border-radius: var(--tandiko-radius);
}

.tandiko-skeleton-circle {
  width: 2.5rem;
  /* Falls back to a square only when the caller sets a width but no height, so a single
     \`width\` prop is enough to draw a circle without a matching \`height\`. Explicit \`height\`
     (set inline, per-instance) still wins over this and sizes the other axis. */
  aspect-ratio: 1;
  border-radius: 50%;
}

@media (prefers-reduced-motion: reduce) {
  /* Slowed, not stopped: a placeholder that never moves at all reports nothing about the wait
     it exists to report. */
  .tandiko-skeleton {
    animation-duration: 3s;
  }
}
`;
