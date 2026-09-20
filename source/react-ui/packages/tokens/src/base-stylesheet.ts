/**
 * The dark-mode overrides, shared verbatim by all three selectors below.
 *
 * `color-scheme: dark` is what moves the mode-resolved colours and the two shadow inks: each is a
 * `light-dark()` in the base rule, and `light-dark()` picks its arm from the element's computed
 * `color-scheme`, so none of them needs a declaration here. The three ramp scalars do —
 * `light-dark()` is defined over `<color>` values and cannot carry a unitless number, so each
 * scalar takes its light value in the base rule and is reassigned here.
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
 *
 * The reduced-motion query is a second, independent axis: it matches `.tandiko-root` plainly
 * and reassigns nothing but the three motion durations, so it composes with any colour mode.
 */
export const baseStylesheet = `
.tandiko-root {
  /* color-scheme: light pins the default arm of the light-dark() colours below, so a host
     page declaring color-scheme: dark on an ancestor cannot darken a root whose Tandiko mode
     is light. The dark rules reassign color-scheme, and that is what selects the -dark arms.

     Every property whose value depends on an environment condition the cascade resolves — the
     mode-resolved colours, the three ramp scalars, the two shadow inks and the three motion
     durations — belongs here rather than in the Theme object ThemeProvider applies inline,
     alongside the color-scheme that resolves the colours. An inline style declaration always
     wins over a stylesheet rule for the same property on the same element, media query or not,
     and these sit on the very element the rules below match, so anything applied inline is
     beyond the reach of every one of them — the switch would be dead on arrival (ADR-0007). */
  color-scheme: light;
  --tandiko-accent: light-dark(var(--tandiko-accent-light), var(--tandiko-accent-dark));
  --tandiko-ink: light-dark(var(--tandiko-ink-light), var(--tandiko-ink-dark));
  --tandiko-surface: light-dark(var(--tandiko-surface-light), var(--tandiko-surface-dark));

  /* The status colour, mode-resolved for the same reason the accent is: a red that reads as an
     error against a near-white ground is muddy against a dark one. */
  --tandiko-danger: light-dark(var(--tandiko-danger-light), var(--tandiko-danger-dark));

  /* The two inks every elevation shadow is drawn in: a tight contact layer and a wide ambient
     one. Both are mode-resolved — the alphas that read as depth over a light surface disappear
     against a dark one, where the shadow has to be near-opaque to register at all — and both
     are colours, so light-dark() carries them exactly as it carries the colours above. */
  --tandiko-shadow-contact: light-dark(oklch(0 0 0 / 0.08), oklch(0 0 0 / 0.44));
  --tandiko-shadow-ambient: light-dark(oklch(0 0 0 / 0.06), oklch(0 0 0 / 0.32));

  /* The light arm of the ramp scalars. They are unitless numbers read inside calc(), which
     light-dark() cannot carry, so the dark rules declare their own values. */
  --tandiko-state-shift: -0.05;
  --tandiko-lift: 0.02;
  --tandiko-sink: 0.04;

  /* Motion durations. fast covers a state change on a control the pointer is already over,
     normal an element entering or leaving the layout, slow a surface crossing the viewport.
     They live here rather than in the Theme for the same reason as everything above: the
     reduced-motion query below reassigns them, and a media query is still a stylesheet rule,
     so an inline declaration on this element would be beyond its reach (ADR-0007). */
  --tandiko-duration-fast: 120ms;
  --tandiko-duration-normal: 200ms;
  --tandiko-duration-slow: 320ms;

  color: var(--tandiko-ink);
  background-color: var(--tandiko-surface);
  font-family: var(--tandiko-font-sans);
}

.tandiko-root[data-tandiko-mode="dark"] {${DARK_DECLARATIONS}}

:root[data-theme="dark"] .tandiko-root:not([data-tandiko-mode="light"]) {${DARK_DECLARATIONS}}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) .tandiko-root:not([data-tandiko-mode="light"]) {${DARK_DECLARATIONS}}
}

@media (prefers-reduced-motion: reduce) {
  /* 0.01ms rather than 0s: a duration of zero makes a transition instantaneous, and an engine
     that skips it fires no transitionend, stranding any listener that drives a state change off
     that event. 0.01ms is equally imperceptible and still completes a transition properly. */
  .tandiko-root {
    --tandiko-duration-fast: 0.01ms;
    --tandiko-duration-normal: 0.01ms;
    --tandiko-duration-slow: 0.01ms;
  }
}
`;
