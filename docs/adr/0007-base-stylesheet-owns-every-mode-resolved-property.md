# The base stylesheet owns every mode-resolved property, including the ramp scalars

`ThemeProvider` spreads the whole `Theme` into an inline `style` object, and an inline
declaration beats any non-`!important` stylesheet rule for the same property on the same
element. So a property whose value has to change with colour mode cannot be part of
`createTheme`'s output: the dark rules in `base-stylesheet.ts` select `.tandiko-root`, which is
the very element carrying the inline theme.

Six `--tandiko-*` properties are mode-resolved. Three are colours — `--tandiko-accent`,
`--tandiko-ink`, `--tandiko-surface`. Three are unitless ramp scalars —
`--tandiko-state-shift`, `--tandiko-lift`, `--tandiko-sink` — read inside `calc()` by the
accent and surface ramps, where `--tandiko-state-shift`'s sign is what makes a hover darken on
a light ground and lighten on a dark one.

`--tandiko-state-shift: -0.05` in `createTheme`'s output is an inline declaration that the
`[data-tandiko-mode="dark"]` rule's `--tandiko-state-shift: 0.05` cannot override. In dark mode
the hover and press steps darken instead of lightening and the raised/sunken surfaces keep
their light-mode sizes, even though `data-tandiko-mode` is set correctly and the colours do
flip. The defect is not specific to the scalars; it is what happens to any mode-resolved
property that `createTheme` emits.

## The decision

**Invariant: a `--tandiko-*` property whose value depends on colour mode is assigned by the
base stylesheet and is absent from `createTheme`'s output.** Every property `createTheme` emits
is mode-invariant — a literal seed value, a `-light`/`-dark` variant derived from the seed, or
an expression that reads a mode-resolved property back through `var()` and so re-derives itself
for free when the mode rule reassigns it.

Concretely:

- `createTheme` emits neither the three colours nor the three scalars. It keeps the
  `-light`/`-dark` colour variants and every ramp expression.
- `.tandiko-root` assigns all six. The three colours resolve as
  `light-dark(var(--tandiko-<x>-light), var(--tandiko-<x>-dark))`, which needs no dark
  counterpart because `light-dark()` picks its arm from the element's computed `color-scheme`.
  The three scalars take their light values there: `-0.05`, `0.02`, `0.04`.
- The dark rules reassign only `color-scheme: dark` and the three scalars (`0.05`, `0.055`,
  `0.025`). `light-dark()` is defined over `<color>` values, so it cannot carry a unitless
  scalar; setting `color-scheme` is what moves the colours, and the scalars need their own
  declarations regardless. The three dark selectors and their `:not([data-tandiko-mode="light"])`
  guards are unaffected.

A consumer overriding a mode-resolved property still can, through a stylesheet rule of their
own, at ordinary specificity.

## Considered options

- **Keep the scalars in `createTheme` and mark the dark declarations `!important`.** This does
  win the cascade, and is the smallest diff. Rejected because `!important` here is not a local
  fix but a permanent escalation: once the dark rule is `!important`, the only way a consumer
  can restyle a scalar is another `!important`, and the package has spent the escape hatch on
  its own default. It also splits the mechanism in two — colours governed by "not set inline",
  scalars by "set inline and shouted down" — so the rule a contributor has to learn stops being
  statable in one sentence, which is exactly how the next mode-resolved property gets added to
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
  Rejected because the flag is still a mode-resolved property assigned somewhere, so it buys no
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
`packages/ui/src/theme.browser.test.ts`.

`packages/ui/vitest.config.ts` defines one browser project, `chromium`. There is no Firefox or
WebKit project, so this decision rests on one engine's behaviour. Relative colour syntax,
`light-dark()` and `color-scheme`-driven resolution inside `oklch(from ...)` are each
independently supported elsewhere, but their interaction is verified here on Chromium alone.
Treat a rendering difference reported on Gecko or WebKit as unexplored territory rather than a
regression against something this repo checks.
