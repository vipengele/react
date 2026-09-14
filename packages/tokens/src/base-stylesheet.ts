/**
 * The dark-mode overrides, shared verbatim by all three selectors below.
 *
 * Reassigning only the three seed-fed colours and the three ramp scalars is enough: every
 * other `--tandiko-*` entry in a `Theme` is an expression reading these back through
 * `var()`, so the browser re-derives the whole ramp from this block alone.
 */
const DARK_DECLARATIONS = `
  color-scheme: dark;
  --tandiko-accent: var(--tandiko-accent-dark);
  --tandiko-ink: var(--tandiko-ink-dark);
  --tandiko-surface: var(--tandiko-surface-dark);
  --tandiko-state-shift: 0.05;
  --tandiko-lift: 0.055;
  --tandiko-sink: 0.025;
`;

/**
 * Base stylesheet for every `.tandiko-root`, injected as an inline `<style>` rather than a
 * `.css` import so the package can stay `"sideEffects": false`.
 *
 * The three dark selectors are ordered by how explicit their signal is, and all three sit
 * at the same specificity-free level of intent:
 *
 * - `.tandiko-root[data-tandiko-mode="dark"]` — the consumer said so on this provider.
 * - `:root[data-theme="dark"] .tandiko-root:not([data-tandiko-mode="light"])` — the host
 *   page said so, and this provider did not say otherwise.
 * - `prefers-color-scheme: dark` — the OS said so, and neither the host page nor this
 *   provider said otherwise.
 *
 * The `:not([data-tandiko-mode="light"])` guards are what make an explicit `colorMode`
 * win over inherited host state; the `:root:not([data-theme="light"])` guard on the media
 * query is what stops the OS preference overriding a host page that has opted into light.
 */
export const baseStylesheet = `
.tandiko-root {
  color: var(--tandiko-ink);
  background-color: var(--tandiko-surface);
  font-family: var(--tandiko-font-sans);
}

.tandiko-root[data-tandiko-mode="dark"] {${DARK_DECLARATIONS}}

:root[data-theme="dark"] .tandiko-root:not([data-tandiko-mode="light"]) {${DARK_DECLARATIONS}}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) .tandiko-root:not([data-tandiko-mode="light"]) {${DARK_DECLARATIONS}}
}
`;
