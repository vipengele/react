/**
 * `<Typography>`'s own styles, injected as an inline `<style>` rather than a `.css` import so
 * the package can stay `"sideEffects": false` (same approach as `@vipengele/react-tokens`'s base
 * stylesheet and `Button`'s stylesheet).
 *
 * Every `--vpg-*` property is *read* here through `var()` and never assigned inline by the
 * component: an inline style declaration always wins over a stylesheet rule for the same
 * property on the same element, so an inline `--vpg-ink` would permanently shadow the
 * dark-mode reassignment in `@vipengele/react-tokens`'s base stylesheet and this text would stop
 * adapting to colour mode.
 *
 * Every variant takes a step of the type scale: the four heading roles the scale's top four steps
 * below `display`, which takes the step above them so the two remain distinguishable.
 */
export const typographyStylesheet = `
.vpg-typography {
  margin: 0;
  font-family: inherit;
}

.vpg-typography-display {
  font-size: var(--vpg-font-size-5xl);
  line-height: 1.1;
  letter-spacing: -0.02em;
}

.vpg-typography-h1 {
  font-size: var(--vpg-font-size-4xl);
  line-height: 1.15;
  letter-spacing: -0.01em;
}

.vpg-typography-h2 {
  font-size: var(--vpg-font-size-3xl);
  line-height: 1.2;
}

.vpg-typography-h3 {
  font-size: var(--vpg-font-size-2xl);
  line-height: 1.25;
}

.vpg-typography-h4 {
  font-size: var(--vpg-font-size-xl);
  line-height: 1.3;
}

.vpg-typography-body-lg {
  font-size: var(--vpg-font-size-lg);
  line-height: 1.5;
}

.vpg-typography-body-md {
  font-size: var(--vpg-font-size-md);
  line-height: 1.5;
}

.vpg-typography-body-sm {
  font-size: var(--vpg-font-size-sm);
  line-height: 1.5;
}

.vpg-typography-caption {
  font-size: var(--vpg-font-size-xs);
  line-height: 1.4;
}

.vpg-typography-weight-regular {
  font-weight: 400;
}

.vpg-typography-weight-medium {
  font-weight: 500;
}

.vpg-typography-weight-bold {
  font-weight: 700;
}

.vpg-typography-color-primary {
  color: var(--vpg-ink);
}

.vpg-typography-color-secondary {
  color: var(--vpg-ink-muted);
}

.vpg-typography-color-subtle {
  color: var(--vpg-ink-subtle);
}

.vpg-typography-color-accent {
  color: var(--vpg-accent);
}
`;
