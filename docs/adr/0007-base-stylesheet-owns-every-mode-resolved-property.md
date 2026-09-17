# The base stylesheet owns every mode-resolved property, including the ramp scalars

`ThemeProvider` spreads the whole `Theme` into an inline `style` object, and an inline
declaration beats any non-`!important` stylesheet rule for the same property on the same
element — a rule inside a media query included, since a media query is still a stylesheet rule.
So a property whose value has to change with an environment condition cannot be part of
`createTheme`'s output: the rules in `base-stylesheet.ts` select `.tandiko-root`, which is the
very element carrying the inline theme.

A `--tandiko-*` property belongs to the stylesheet when its own declared value has to differ
between the states of a condition only the cascade knows. Colour mode is one such condition. The
three colours the theme switches wholesale — `--tandiko-accent`, `--tandiko-ink`,
`--tandiko-surface` — turn on it, and so do the two inks every elevation shadow is drawn in,
`--tandiko-shadow-contact` and `--tandiko-shadow-ambient`, whose alphas have to climb on a dark
ground to register at all. So do the three unitless ramp scalars — `--tandiko-state-shift`,
`--tandiko-lift`, `--tandiko-sink` — read inside `calc()` by the accent and surface ramps, where
`--tandiko-state-shift`'s sign is what makes a hover darken on a light ground and lighten on a
dark one.

`prefers-reduced-motion` is a second such condition, and the motion durations
`--tandiko-duration-fast`, `--tandiko-duration-normal` and `--tandiko-duration-slow` turn on it:
under `reduce` they collapse to `0.01ms`. The easings do not — a curve shapes a transition's
progress and says nothing at a collapsed duration — so `--tandiko-ease-*` stays in the theme.

Being a colour is not what puts a property in that set, and neither is being a motion token.
Most `--tandiko-*` colours are invariant across both conditions: the `-light`/`-dark` variants
hold literal or seed-derived values, and `--tandiko-border`, `--tandiko-accent-hover`,
`--tandiko-surface-raised` and the rest of the ramps are expressions that read a stylesheet-owned
property back through `var()`, so they re-derive themselves the moment a rule reassigns it.

`--tandiko-state-shift: -0.05` in `createTheme`'s output is an inline declaration that the
`[data-tandiko-mode="dark"]` rule's `--tandiko-state-shift: 0.05` cannot override. In dark mode
the hover and press steps darken instead of lightening and the raised/sunken surfaces keep
their light-mode sizes, even though `data-tandiko-mode` is set correctly and the colours do
flip. A duration emitted inline fails the same way and more quietly: the
`@media (prefers-reduced-motion: reduce)` block parses, matches, and is beaten on the element it
matches, so every transition runs at full length for a user who asked for none. The defect is
not specific to the scalars; it is what happens to any property that `createTheme` emits and a
stylesheet rule has to reassign.

## The decision

**Invariant: a `--tandiko-*` property whose value depends on an environment condition the
cascade resolves — the colour mode, the reduced-motion preference — is assigned by the base
stylesheet and is absent from `createTheme`'s output.** Every property `createTheme` emits is
invariant across those conditions — a literal seed value, a `-light`/`-dark` variant derived from
the seed, or an expression that reads a stylesheet-owned property back through `var()` and so
re-derives itself for free when a rule reassigns it.

Concretely:

- `createTheme` emits none of the stylesheet-owned colours, scalars or durations. It keeps the
  `-light`/`-dark` colour variants, every ramp expression and the easings.
- `.tandiko-root` assigns every stylesheet-owned property. The colours resolve through
  `light-dark()` — the seed-derived ones as
  `light-dark(var(--tandiko-<x>-light), var(--tandiko-<x>-dark))`, the shadow inks as literal
  `light-dark()` values — needing no dark counterpart because `light-dark()` picks its arm from
  the element's computed `color-scheme`. The three scalars take their light values there:
  `-0.05`, `0.02`, `0.04`.
- The dark rules reassign only `color-scheme: dark` and the three scalars (`0.05`, `0.055`,
  `0.025`). `light-dark()` is defined over `<color>` values, so it cannot carry a unitless
  scalar; setting `color-scheme` is what moves the colours, and the scalars need their own
  declarations regardless. The three dark selectors and their `:not([data-tandiko-mode="light"])`
  guards are unaffected.
- The durations take their full-motion values on `.tandiko-root` — `120ms`, `200ms`, `320ms` —
  and an `@media (prefers-reduced-motion: reduce)` block matching `.tandiko-root` reassigns all
  three to `0.01ms`. The collapsed value is not `0s`: an engine that skips a zero-length
  transition fires no `transitionend`, stranding any listener that drives a state change off that
  event, while `0.01ms` is equally imperceptible and still completes. The query matches
  `.tandiko-root` plainly and touches nothing but the durations, so it composes with whichever
  colour mode is in force.

A consumer overriding a stylesheet-owned property still can, through a stylesheet rule of their
own, at ordinary specificity.

## Considered options

- **Keep the scalars in `createTheme` and mark the dark declarations `!important`.** This does
  win the cascade, and is the smallest diff. Rejected because `!important` here is not a local
  fix but a permanent escalation: once the dark rule is `!important`, the only way a consumer
  can restyle a scalar is another `!important`, and the package has spent the escape hatch on
  its own default. It also splits the mechanism in two — colours governed by "not set inline",
  scalars by "set inline and shouted down" — so the rule a contributor has to learn stops being
  statable in one sentence, which is exactly how the next stylesheet-owned property gets added to
  `createTheme` by accident.
- **Derive the scalars from a single sign multiplier**, e.g. `--tandiko-mode-sign: 1 | -1` with
  each scalar written `calc(var(--tandiko-mode-sign) * <magnitude>)`. Rejected on the values
  themselves: only `--tandiko-state-shift` changes sign. `--tandiko-lift` widens (`0.02` →
  `0.055`) and `--tandiko-sink` narrows (`0.04` → `0.025`), both staying positive, because a
  dark ground needs more lift to read as raised and less sink before it reads as a hole. A sign
  multiplier cannot express an asymmetric magnitude change. It also leaves the multiplier itself
  mode-resolved, so it faces this ADR's problem one indirection deeper rather than solving it.
- **Encode the mode into one scalar-carrying property** — a 0/1 flag with each scalar written
  `calc(<light> + var(--tandiko-mode-flag) * (<dark> - <light>))`. This is arithmetically
  general, unlike the sign multiplier, and shrinks the dark rule to a single declaration.
  Rejected because the flag is still a stylesheet-owned property assigned somewhere, so it buys no
  structural simplification over assigning the three scalars directly, while making every
  scalar's two values unreadable at the point of declaration and obliging each new scalar to
  re-derive the interpolation by hand.
- **Have `ThemeProvider` pick the dark values in JS and keep applying them inline.** Rejected
  because `colorMode` is optional by design: omitted, no `data-tandiko-mode` is written and the
  mode comes from the host page's `[data-theme]` or `prefers-color-scheme`, neither of which
  `ThemeProvider` knows at render time. Recovering them means a media-query listener and reading
  ancestor DOM, which renders the wrong mode on the server and then flashes, and which makes the
  cascade's fall-through behaviour something JS has to reimplement.

## The evidence is Chromium-only

That Chromium resolves `oklch(from var(--x) calc(l + var(--s)) c h)` correctly when `--x` holds
a `light-dark()` — picking the arm matching `color-scheme`, including when a mode rule changes
`color-scheme` and the scalar in the same declaration block — is covered by
`packages/ui/src/theme.browser.test.ts`. That the durations collapse under
`prefers-reduced-motion: reduce` is covered by `packages/ui/src/theme-motion.browser.test.ts`,
which emulates the preference through Chromium's own media emulation over CDP.

`packages/ui/vitest.config.ts` defines one browser project, `chromium`. There is no Firefox or
WebKit project, so this decision rests on one engine's behaviour. Relative colour syntax,
`light-dark()` and `color-scheme`-driven resolution inside `oklch(from ...)` are each
independently supported elsewhere, but their interaction is verified here on Chromium alone.
Treat a rendering difference reported on Gecko or WebKit as unexplored territory rather than a
regression against something this repo checks.
