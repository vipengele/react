# Mode-resolved colours are expressed once as `light-dark()`, switched by `color-scheme`

ADR-0007 settles _who_ assigns a mode-resolved property: the base stylesheet, never
`createTheme`'s inline output. This one settles _how_ the mode-resolved colours are written in
that stylesheet.

Each of them is assigned exactly once, in the unconditional `.tandiko-root` rule, as a
`light-dark()` over the two appearances it can take — the seed-derived colours as
`light-dark(var(--tandiko-<x>-light), var(--tandiko-<x>-dark))`, the two shadow inks as a
`light-dark()` of literal `oklch()` values. `light-dark()` picks its arm from the element's
computed `color-scheme`, so the dark rules declare no colour at all: they declare
`color-scheme: dark`, and every colour and ink follows. The three ramp scalars are the exception
and stay declared per mode, because `light-dark()` is defined over `<color>` values and cannot
carry a unitless number.

`color-scheme: light` on the base rule is load-bearing, not a restatement of the initial value.
`color-scheme` inherits, so a host page declaring `color-scheme: dark` on an ancestor would
otherwise reach a `.tandiko-root` whose Tandiko mode is light and select every dark arm under it,
with `data-tandiko-mode="light"` still on the element and every dark selector correctly not
matching. Pinning it here makes a dark rule's own `color-scheme: dark` the only thing in the
document that can select the dark arms.

What this buys is that the mode switch is one property rather than a set. A colour's two
appearances are stated together on one line, at the point the property is declared, and a new
mode-resolved colour is one `light-dark()` line — there is no second place it also has to be
named, so there is no second place to forget it. It also means `color-scheme` is not a parallel
declaration that has to be kept agreeing with the colours: it is what resolves them, so a root
whose native controls, scrollbars and caret render in one mode cannot be showing theme colours
from the other.

The two arms remain ordinary `--tandiko-*-light`/`-dark` properties that `createTheme` emits, so
a consumer can override either appearance of a colour — `--tandiko-accent-dark`, say — without
touching the stylesheet-owned property that composes them.

## Considered options

- **Reassign each colour per mode**, keeping `--tandiko-accent` etc. as their light values in the
  base rule and adding `--tandiko-accent: var(--tandiko-accent-dark);` to the shared dark
  declarations. This is the plainest cascade mechanism and leans on nothing beyond `var()`.
  Rejected because the mode would then be expressed twice: `color-scheme` still has to be set on
  a dark root for the browser's own chrome, so every mode-resolved colour needs a dark
  declaration _and_ the scheme needs one, and the two can disagree. The failure that follows is
  quiet and partial — a colour added to the base rule and not to the dark block stays light while
  everything around it flips, which reads as a palette bug rather than a missing declaration. It
  also scales per colour: five properties today, and every future mode-resolved colour is a line
  in two places.
- **Derive the dark appearance inline, inside the `light-dark()`** — writing
  `light-dark(var(--tandiko-accent), oklch(from var(--tandiko-accent) ...))` and dropping the
  `-light`/`-dark` variants. Rejected because it is a cycle: `--tandiko-accent` is the property
  being declared, so an arm reading `var(--tandiko-accent)` is self-referential and invalid at
  computed-value time, taking the whole declaration with it. Deriving from `--tandiko-accent-light`
  instead is exactly the arrangement chosen here, with the derivation named as its own property;
  the naming is also what lets a consumer override one appearance.
- **Resolve the arms in JS and emit the mode's colours from `createTheme`.** Rejected by
  ADR-0007's invariant before it reaches this question: the result lands inline on `.tandiko-root`
  where no mode rule can reach it, and `colorMode` is optional, so the mode is frequently
  something only the cascade knows.

## The evidence is Chromium-only

The whole arrangement rests on `oklch(from var(--x) ...)` resolving correctly when `--x` holds a
`light-dark()`: the ramps derive from the mode-resolved colour, so the engine has to pick the arm
matching `color-scheme` and only then apply the relative-colour arithmetic.
`packages/ui/src/theme.browser.test.ts` measures that on fixtures, including the case where a mode
rule changes `color-scheme` and a ramp scalar in the same block, and
`packages/ui/src/theme-scheme.browser.test.ts` checks the shipped `ThemeProvider` resolves each
`light-dark()` colour through the arm its `color-scheme` selects.

`packages/ui/vitest.config.ts` defines one browser project, `chromium`. There is no Firefox or
WebKit project, so the interaction this decision depends on is verified on a single engine.
Treat a rendering difference reported on Gecko or WebKit as unexplored territory rather than a
regression against something this repo checks.
