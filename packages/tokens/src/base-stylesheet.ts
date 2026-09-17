/**
 * The dark-mode overrides, shared verbatim by all three selectors below.
 *
 * `color-scheme: dark` is what moves the three colours: each is a `light-dark()` in the base
 * rule, and `light-dark()` picks its arm from the element's computed `color-scheme`, so the
 * colours need no declaration here. The three ramp scalars do need one — `light-dark()` is
 * defined over `<color>` values and cannot carry a unitless number, so each scalar takes its
 * light value in the base rule and is reassigned here.
 *
 * Every other `--tandiko-*` entry in a `Theme` is an expression reading the colours and
 * scalars back through `var()`, so the browser re-derives the whole ramp from this block
 * plus the `color-scheme` switch.
 */
const DARK_DECLARATIONS = `
  color-scheme: dark;
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
  /* color-scheme: light pins the default arm of the light-dark() colours below, so a host
     page declaring color-scheme: dark on an ancestor cannot darken a root whose Tandiko mode
     is light. The dark rules reassign color-scheme, and that is what selects the -dark arms.

     Every mode-resolved property — the three colours and the three ramp scalars — belongs
     here rather than in the Theme object ThemeProvider applies inline, alongside the
     color-scheme that resolves the colours. An inline style declaration always wins over a
     stylesheet rule for the same property on the same element, and these sit on the very
     element the dark selectors below match, so anything applied inline is beyond the reach of
     every one of those rules — the mode switch would be dead on arrival (ADR-0007). */
  color-scheme: light;
  --tandiko-accent: light-dark(var(--tandiko-accent-light), var(--tandiko-accent-dark));
  --tandiko-ink: light-dark(var(--tandiko-ink-light), var(--tandiko-ink-dark));
  --tandiko-surface: light-dark(var(--tandiko-surface-light), var(--tandiko-surface-dark));

  /* The light arm of the ramp scalars. They are unitless numbers read inside calc(), which
     light-dark() cannot carry, so the dark rules declare their own values. */
  --tandiko-state-shift: -0.05;
  --tandiko-lift: 0.02;
  --tandiko-sink: 0.04;

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
