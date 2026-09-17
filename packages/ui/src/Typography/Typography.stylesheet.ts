/**
 * `<Typography>`'s own styles, injected as an inline `<style>` rather than a `.css` import so
 * the package can stay `"sideEffects": false` (same approach as `@tandiko/tokens`'s base
 * stylesheet and `Button`'s stylesheet).
 *
 * Every `--tandiko-*` property is *read* here through `var()` and never assigned inline by the
 * component: an inline style declaration always wins over a stylesheet rule for the same
 * property on the same element, so an inline `--tandiko-ink` would permanently shadow the
 * dark-mode reassignment in `@tandiko/tokens`'s base stylesheet and this text would stop
 * adapting to colour mode.
 *
 * Every variant takes a step of the type scale. `--tandiko-typography-display-size`, `-h1-size`
 * and `-h2-size` have no definition in `@tandiko/tokens`, so those three reads carry a
 * fallback.
 */
export const typographyStylesheet = `
.tandiko-typography {
  margin: 0;
  font-family: inherit;
}

.tandiko-typography-display {
  font-size: var(--tandiko-typography-display-size, 3.5rem);
  line-height: 1.1;
  letter-spacing: -0.02em;
}

.tandiko-typography-h1 {
  font-size: var(--tandiko-typography-h1-size, 2.5rem);
  line-height: 1.15;
  letter-spacing: -0.01em;
}

.tandiko-typography-h2 {
  font-size: var(--tandiko-typography-h2-size, 2rem);
  line-height: 1.2;
}

.tandiko-typography-h3 {
  font-size: var(--tandiko-font-size-2xl);
  line-height: 1.25;
}

.tandiko-typography-h4 {
  font-size: var(--tandiko-font-size-xl);
  line-height: 1.3;
}

.tandiko-typography-body-lg {
  font-size: var(--tandiko-font-size-lg);
  line-height: 1.5;
}

.tandiko-typography-body-md {
  font-size: var(--tandiko-font-size-md);
  line-height: 1.5;
}

.tandiko-typography-body-sm {
  font-size: var(--tandiko-font-size-sm);
  line-height: 1.5;
}

.tandiko-typography-caption {
  font-size: var(--tandiko-font-size-xs);
  line-height: 1.4;
}

.tandiko-typography-weight-regular {
  font-weight: 400;
}

.tandiko-typography-weight-medium {
  font-weight: 500;
}

.tandiko-typography-weight-bold {
  font-weight: 700;
}

.tandiko-typography-color-primary {
  color: var(--tandiko-ink);
}

.tandiko-typography-color-secondary {
  color: var(--tandiko-ink-muted);
}

.tandiko-typography-color-subtle {
  color: var(--tandiko-ink-subtle);
}

.tandiko-typography-color-accent {
  color: var(--tandiko-accent);
}
`;
