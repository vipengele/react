/**
 * The dark-mode overrides, shared verbatim by all three selectors below.
 *
 * `color-scheme: dark` is what moves the mode-resolved colours and the two shadow inks: each is a
 * `light-dark()` in the base rule, and `light-dark()` picks its arm from the element's computed
 * `color-scheme`, so none of them needs a declaration here. The three ramp scalars do —
 * `light-dark()` is defined over `<color>` values and cannot carry a unitless number, so each
 * scalar takes its light value in the base rule and is reassigned here.
 *
 * Every other `--vpg-*` entry in a `Theme` is an expression reading the colours and
 * scalars back through `var()`, so the browser re-derives the whole ramp from this block
 * plus the `color-scheme` switch.
 */
const DARK_DECLARATIONS = `
  color-scheme: dark;
  --vpg-state-shift: 0.05;
  --vpg-lift: 0.055;
  --vpg-sink: 0.025;
`;

/**
 * Base stylesheet for every `.vpg-root`, injected as an inline `<style>` rather than a
 * `.css` import so the package can stay `"sideEffects": false`.
 *
 * The three dark selectors are ordered by how explicit their signal is, and all three sit
 * at the same specificity-free level of intent:
 *
 * - `.vpg-root[data-vpg-mode="dark"]` — the consumer said so on this provider.
 * - `:root[data-theme="dark"] .vpg-root:not([data-vpg-mode="light"])` — the host
 *   page said so, and this provider did not say otherwise.
 * - `prefers-color-scheme: dark` — the OS said so, and neither the host page nor this
 *   provider said otherwise.
 *
 * The `:not([data-vpg-mode="light"])` guards are what make an explicit `colorMode`
 * win over inherited host state; the `:root:not([data-theme="light"])` guard on the media
 * query is what stops the OS preference overriding a host page that has opted into light.
 *
 * The reduced-motion query is a second, independent axis: it matches `.vpg-root` plainly
 * and reassigns nothing but the three motion durations, so it composes with any colour mode.
 */
export const baseStylesheet = `
.vpg-root {
  /* color-scheme: light pins the default arm of the light-dark() colours below, so a host
     page declaring color-scheme: dark on an ancestor cannot darken a root whose Vipengele mode
     is light. The dark rules reassign color-scheme, and that is what selects the -dark arms.

     Every property whose value depends on an environment condition the cascade resolves — the
     mode-resolved colours, the three ramp scalars, the two shadow inks and the three motion
     durations — belongs here rather than in the Theme object ThemeProvider applies inline,
     alongside the color-scheme that resolves the colours. An inline style declaration always
     wins over a stylesheet rule for the same property on the same element, media query or not,
     and these sit on the very element the rules below match, so anything applied inline is
     beyond the reach of every one of them — the switch would be dead on arrival (ADR-0007). */
  color-scheme: light;
  --vpg-accent: light-dark(var(--vpg-accent-light), var(--vpg-accent-dark));
  --vpg-ink: light-dark(var(--vpg-ink-light), var(--vpg-ink-dark));
  --vpg-surface: light-dark(var(--vpg-surface-light), var(--vpg-surface-dark));

  /* The status colour, mode-resolved for the same reason the accent is: a red that reads as an
     error against a near-white ground is muddy against a dark one. */
  --vpg-danger: light-dark(var(--vpg-danger-light), var(--vpg-danger-dark));

  /* The two inks every elevation shadow is drawn in: a tight contact layer and a wide ambient
     one. Both are mode-resolved — the alphas that read as depth over a light surface disappear
     against a dark one, where the shadow has to be near-opaque to register at all — and both
     are colours, so light-dark() carries them exactly as it carries the colours above. */
  --vpg-shadow-contact: light-dark(oklch(0 0 0 / 0.08), oklch(0 0 0 / 0.44));
  --vpg-shadow-ambient: light-dark(oklch(0 0 0 / 0.06), oklch(0 0 0 / 0.32));

  /* The light arm of the ramp scalars. They are unitless numbers read inside calc(), which
     light-dark() cannot carry, so the dark rules declare their own values. */
  --vpg-state-shift: -0.05;
  --vpg-lift: 0.02;
  --vpg-sink: 0.04;

  /* Motion durations. fast covers a state change on a control the pointer is already over,
     normal an element entering or leaving the layout, slow a surface crossing the viewport.
     They live here rather than in the Theme for the same reason as everything above: the
     reduced-motion query below reassigns them, and a media query is still a stylesheet rule,
     so an inline declaration on this element would be beyond its reach (ADR-0007). */
  --vpg-duration-fast: 120ms;
  --vpg-duration-normal: 200ms;
  --vpg-duration-slow: 320ms;

  color: var(--vpg-ink);
  background-color: var(--vpg-surface);
  font-family: var(--vpg-font-sans);
}

.vpg-root[data-vpg-mode="dark"] {${DARK_DECLARATIONS}}

:root[data-theme="dark"] .vpg-root:not([data-vpg-mode="light"]) {${DARK_DECLARATIONS}}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) .vpg-root:not([data-vpg-mode="light"]) {${DARK_DECLARATIONS}}
}

@media (prefers-reduced-motion: reduce) {
  /* 0.01ms rather than 0s: a duration of zero makes a transition instantaneous, and an engine
     that skips it fires no transitionend, stranding any listener that drives a state change off
     that event. 0.01ms is equally imperceptible and still completes a transition properly. */
  .vpg-root {
    --vpg-duration-fast: 0.01ms;
    --vpg-duration-normal: 0.01ms;
    --vpg-duration-slow: 0.01ms;
  }
}
`;
