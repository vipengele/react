---
about: "component-scoped --tandiko-* names read fallbacks that disagree with the cross-cutting scales, so defining those names changes rendering"
saw:
  - "packages/ui/src"
  - "packages/tokens/src/theme.ts"
---

Components read component-scoped token names that `createTheme` does not emit, each with a
literal fallback in the `var()` — `--tandiko-button-height-md` falling back to `2.25rem`,
`--tandiko-typography-body-md-size` falling back to `1rem`, and others in the same shape. The
fallback is what renders today.

`createTheme` emits the cross-cutting scales instead (`--tandiko-size-*`, `--tandiko-space-*`,
`--tandiko-font-size-*`, `--tandiko-duration-*`, `--tandiko-shadow-*`), and deliberately does
**not** define the component-scoped names.

This is not an oversight, and the reason constrains any migration onto the scales: **the
fallbacks disagree with the values the scales carry.** `--tandiko-button-height-md` falls back
to `2.25rem` where the size scale's `md` step is `2rem`; `--tandiko-typography-body-md-size`
falls back to `1rem` where the type scale's body step is `0.875rem`. Defining a component-scoped
name therefore changes that component's rendering the moment it lands — silently, because
nothing reads as broken, the control just changes size.

So a change that supplies these names is a visual change and has to be planned and reviewed as
one. It cannot ride along inside a refactor advertised as rendering-neutral, and the two
constraints — "adopt the scale" and "change nothing on screen" — cannot both hold for the same
property in the same change.

`--tandiko-radius-sm`/`-lg` sit in the same position: they are `calc()` multiples of the seed
radius rather than steps chosen against the intended values, and correcting them moves rendering.
