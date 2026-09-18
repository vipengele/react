# The radius steps derive from the seed at ×0.75 and ×1.5

`createTheme` emits four corner radii: `--tandiko-radius` carrying the seed, `--tandiko-radius-sm`
and `--tandiko-radius-lg` as `calc()` multiples of it, and `--tandiko-radius-full` for a pill. Every
component in `packages/ui` reads one of the four bare, with no fallback (ADR-0009), so the two
multipliers alone decide every corner in the library that is not a pill.

The measured target for a library of 32px controls is **6–8px on an inner corner** — a field, a
button, an option row — and **10–12px on an outer one**: a card, a popover, a dialog. Inside that
range a 32px control reads as rounded; below it the corner reads as a rectangle at a glance, and a
16px corner on a 32px box is halfway to a pill and swallows the horizontal padding beside it.

**The decision: `--tandiko-radius-sm` is `calc(var(--tandiko-radius) * 0.75)` and
`--tandiko-radius-lg` is `calc(var(--tandiko-radius) * 1.5)`, landing on 6px and 12px at the default
`0.5rem` seed.** Both are the low end of their range, which is where the pair stays coherent: the
outer step is exactly twice the inner, so a card and the field inside it are visibly a family
rather than two unrelated curvatures.

## The steps stay seed-derived

`radius` is one of the seven fields of `ThemeSeed`, and its point is that a consumer states one
corner radius and gets a ladder. Absolute values per step break that: a consumer seeding
`radius: "2px"` for a square-cornered product would keep a 12px outer corner on every card,
and the seed would silently govern one third of the property family it names. The multipliers keep
the ladder proportional — reseeding moves all three together, in the ratio this decision fixes.

The cost is that the target range is only met at the default seed. That is the right place to meet
it: the default is what the design bar is measured against, and a consumer who reseeds is choosing
a different bar.

## Why this is its own decision

ADR-0009 maps fifty-four component-scoped names onto the scale families and changes thirteen
measurements in doing so. The radius multipliers are independent of that mapping: both properties
are already defined, every component already reads them bare, and no row of that table depends on
their values.

Running the two together would put every corner in the library into the same screenshot diff as
every height, padding, font size and shadow, where a reviewer looking at a changed button cannot
attribute the difference to the mapping or to the radius. Separated, each diff answers one
question.

## Verification

The multipliers are pinned as expressions in `packages/tokens/src/theme.test.ts`, which is all a
unit test can do: jsdom resolves no custom property and evaluates no `calc()`, so a `calc()` string
proves the arithmetic is written down, not that it computes 6px.

The pixels are asserted in `packages/ui/src/theme-scalars.browser.test.ts`, under a real
default-seed `ThemeProvider` in headless Chromium. The lengths are read off a probe's resolved
`border-radius` rather than off the custom property itself: the computed value of an unregistered
custom property is its substituted token stream, so reading the property back hands over the
`calc()` expression. Consumed as a length — the way a component consumes it — the engine resolves
it, and that assertion is the only thing in the repo that measures the design target.

## Considered options

- **×0.5 and ×2**, the geometric ladder either side of the seed. It is the most obvious pair and
  needs no justification per step. Rejected because it lands on 4px and 16px at the default seed,
  missing the target at both ends: 4px reads as a rectangle on a 32px control, and a 16px corner on
  a card is a rounded lozenge that fights the 32px controls inside it.
- **Absolute values per step — `--tandiko-radius-sm: 6px`, `--tandiko-radius-lg: 12px`.** This is
  the most direct statement of the target and cannot drift with the seed. Rejected because it
  severs the ladder: a consumer reseeding `radius` gets two steps that no longer relate to the
  value they set, so the seed field governs one property of three and the family it names stops
  being a family.
- **×0.75 and ×2, keeping the wider outer step.** The inner corner reaches 6px and the outer stays
  a bolder 16px. Rejected because 16px is outside the measured range for an outer surface, and the
  ratio between the two steps stops being readable as one: an inner corner at 6px beside an outer
  at 16px reads as two different curvatures rather than two steps of one.
- **A `radiusSm`/`radiusLg` seed field per step**, letting a consumer state all three. Rejected
  because it widens the seed to solve a problem no consumer has reported, and a seed whose fields
  can disagree with each other admits exactly the incoherent ladder the multipliers exist to
  prevent. The route to an unrelated step is already open: `overrides` carries
  `--tandiko-radius-lg` without a new seed field.
