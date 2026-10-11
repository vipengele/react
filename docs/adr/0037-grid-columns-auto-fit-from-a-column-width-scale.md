# Grid's columns auto-fit from a column-width scale

`Grid` lays out its children in columns. A consumer wants one of two things from it: a fixed
number of columns ("three across"), or as many columns as fit, each no narrower than some width,
so the same grid shows four cards on a desktop and one on a phone. The second is where
responsiveness comes from, and ADR-0019 (*Layout primitives accept token values only*) left both
of its open questions to the `Grid` that needs them: whether responsive values exist at all, and
which scale supplies the minimum column width.

## Responsiveness is intrinsic

**The decision: an auto-fitting `Grid` is responsive through CSS's own track sizing, with no
breakpoints.** Its stylesheet reads

```css
grid-template-columns: repeat(auto-fit, minmax(min(var(--vpg-grid-min-column), 100%), 1fr));
```

where `--vpg-grid-min-column` is the `var()` read of a column-width step the instance writes
inline. The browser fits as many columns as the container's width allows at that minimum and
shares the remainder between them.

- **`auto-fit`, not `auto-fill`.** `auto-fill` keeps the empty tracks it could have fitted, so
  two items in a wide container sit at the left at their minimum width with a row of nothing
  beside them. `auto-fit` collapses the empty tracks, and the two items stretch across the
  container.
- **`min(…, 100%)`** keeps a column from overflowing a container narrower than one step: the
  minimum becomes the container's width and the grid shows one column.
- **No breakpoints, no responsive object props, no container queries.** The grid responds to the
  width of its own container, which is what a layout inside a sidebar, a card or a modal needs,
  and it does so with no measurement in the prop API.

## The column-width scale

`@vipengele/react-tokens` emits `--vpg-column-sm|md|lg|xl` — `12rem`, `16rem`, `20rem`,
`24rem` — and `Grid`'s minimum-column prop takes the name of one of those steps. The step is a
length, so under ADR-0019's guardrail it is a token name, never a length; the scale
gives it a token to name. Like every other scale, a consumer reshapes it through `createTheme`'s
`overrides`, and a step past `xl` is a new token in `theme.ts`, not a length on the prop.

**This supersedes ADR-0019's "What is not committed" bullet** on a minimum column width for
auto-fitting grids, which left open whether the size scale or the spacing scale supplies it.
Neither does: the column-width scale does.

## The always-write rule is narrowed to the active mode

ADR-0019 commits that a primitive always writes its properties, so its stylesheet reads each one
bare, with no literal fallback (ADR-0009, *Components read role tokens with no literal
fallback*). `Grid` has two modes that read different properties:

- **Fixed columns** — `columns` set. The instance writes `--vpg-grid-columns`, a positive
  integer, and the rule for this mode repeats that many equal tracks.
- **Auto-fit** — no `columns`. The instance writes `--vpg-grid-min-column`, the `var()` read of
  a column-width step, and the rule above reads it.

Writing both in every instance would set a property no rule reads. The rule becomes: **a
primitive always writes every property its active mode reads.** Each mode's stylesheet rule reads
its own property bare, and a property only the other mode reads goes unwritten. The guarantee
ADR-0009 needs — no bare read of a property nobody set — still holds, because each rule reads
only what its mode writes. Every other primitive has one mode, so for them the narrowed rule and
the original say the same thing.

## GridItem

`GridItem` places one child in a `Grid` through `colSpan` and `rowSpan`, each a positive integer
written as a component-scoped property under ADR-0019's naming. It has no React context and no dev-time check that its parent is a `Grid`: it sets
grid-placement properties on its own element, and those mean the same thing inside any CSS grid.

`colSpan` is meant for a fixed-`columns` grid, where the column count is known and a span of two
is a known fraction of the row. Inside an auto-fit grid it is plain CSS behaviour: the item spans
that many of however many tracks currently fit, and where fewer fit than the span asks for, the
grid gains implicit tracks for it. Nothing in `Grid` or `GridItem` guards against that.

## Accepted risk: tokens older than ui

`@vipengele/react-tokens` is a peer dependency of `@vipengele/react-ui`. A consumer who upgrades
the ui package without upgrading tokens has a theme with no `--vpg-column-*`. The inline
`--vpg-grid-min-column: var(--vpg-column-md)` then resolves to the guaranteed-invalid value, and
a bare `var()` inside `grid-template-columns` makes the whole declaration invalid at
computed-value time. The property falls back to its initial value, `none`, and every auto-fit
`Grid` renders as one column, with no console error. Fixed-`columns` grids are unaffected.

ADR-0009 forbids the fallback that would hide this (`var(--vpg-column-md, 16rem)`), and that
rule stands: a literal fallback is a second copy of the scale that silently disagrees with a
consumer's overrides. The peer range is what prevents the mismatch; the failure it leaves is
visible on the first page that uses an auto-fit `Grid`.

## Considered options

- **A responsive object prop** — `columns={{ sm: 1, md: 2, lg: 4 }}`. Rejected because it needs
  breakpoint tokens, which ADR-0019 deliberately defers: a breakpoint scale is its own decision,
  and taking it inside `Grid` would make it for every primitive at once. It also responds to the
  viewport, not to the container the grid actually sits in.
- **Container-query steps** — the stylesheet switches column count at container widths. This
  responds to the right width, but its thresholds are breakpoints by another name and need the
  same tokens, with a rule per step in `Grid`'s stylesheet.
- **The size scale for the minimum column width.** Rejected because the size scale holds the
  heights of things a pointer targets; `--vpg-size-xl` is `2.5rem`. Stretching it to `16rem`
  mixes control heights with column widths in one family, and a consumer who resizes controls
  would resize every grid's columns with them.
- **The spacing scale.** Rejected because it tops out at `space-8`, `2rem` — a gap, not a column.
  Extending it to `space-64` puts steps between columns and gaps no component would ever read.
- **`auto-fill`.** Rejected for the empty tracks described above: a grid with fewer items than
  would fit leaves them stranded at minimum width instead of filling its row.
