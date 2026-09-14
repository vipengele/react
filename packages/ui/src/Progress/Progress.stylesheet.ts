/**
 * `<Progress>`'s own styles, injected as an inline `<style>` rather than a `.css` import so the
 * package can stay `"sideEffects": false` (same approach as `Skeleton`'s and `Avatar`'s
 * stylesheets).
 *
 * Every `--tandiko-*` property this component depends on is *read* here through `var()` and
 * never assigned inline by the component: an inline style declaration always wins over a
 * stylesheet rule for the same property on the same element, so an inline `--tandiko-accent`
 * would permanently shadow the dark-mode reassignment in `@tandiko/tokens`'s base stylesheet.
 * The per-instance fill width is an unprefixed inline `width`, not a `--tandiko-*` custom
 * property, so it carries no such risk.
 *
 * The indeterminate sweep animates a translated fill's own width and position rather than
 * `background-position`, since there is no filled/unfilled boundary to hold still against —
 * unlike a determinate bar, the whole fill segment travels the track.
 */
export const progressStylesheet = `
@keyframes tandiko-progress-sweep {
  0% { left: -40%; width: 40%; }
  50% { width: 60%; }
  100% { left: 100%; width: 40%; }
}

.tandiko-progress {
  position: relative;
  display: block;
  overflow: hidden;
  box-sizing: border-box;
  border-radius: var(--tandiko-radius-sm);
  background-color: var(--tandiko-surface-raised);
}

.tandiko-progress-sm {
  height: 0.25rem;
}

.tandiko-progress-md {
  height: 0.5rem;
}

.tandiko-progress-lg {
  height: 0.75rem;
}

.tandiko-progress-fill {
  height: 100%;
  border-radius: inherit;
  background-color: var(--tandiko-accent);
}

.tandiko-progress-determinate .tandiko-progress-fill {
  transition: width 0.2s ease-out;
}

.tandiko-progress-indeterminate .tandiko-progress-fill {
  position: absolute;
  top: 0;
  animation: tandiko-progress-sweep 1.5s ease-in-out infinite;
}

@media (prefers-reduced-motion: reduce) {
  /* Slowed, not stopped: a bar that never moves at all reports nothing about the wait it exists
     to report. */
  .tandiko-progress-indeterminate .tandiko-progress-fill {
    animation-duration: 3s;
  }
}
`;
