# Center caps content width from a width scale

A page needs its content held to a readable width: a form, an article or a settings page that
fills a 2560px monitor edge to edge is harder to read than one that stops growing and centres in
the space left over. ADR-0019 (*Layout primitives accept token values only*) names `Center` as
one of the layout primitives without deciding its props. `Center` is the primitive that does
this: it caps its content at a maximum width, centres it with auto inline margins, and keeps it
off the viewport's edges with inline padding.

The maximum is a length, so under ADR-0019's guardrail the prop that sets it takes a token name,
never a length. No existing scale holds a token of the right kind.

## A width scale, separate from the column-width scale

**The decision: `@vipengele/react-tokens` emits `--vpg-width-sm|md|lg|xl` — `40rem`, `48rem`,
`64rem`, `80rem` — and `Center`'s `max` prop takes the name of one of those steps.**

The column-width scale (ADR-0022, *Grid's columns auto-fit from a column-width scale*) is the
nearest scale, and the obvious move is to give it more steps. It is the wrong axis. A column step
is a **floor**: the narrowest a grid track may shrink to before the grid holds one column fewer,
tuned so that `sm`–`xl` (`12rem`–`24rem`) are all plausible card widths. A width step is a
**ceiling**: the widest a whole block of content may grow to. The two answer different questions
about different elements, and a page-shell width of `64rem` is never a sensible minimum for a
single grid track, nor `16rem` a sensible cap on a page. Stretching one scale over both would
leave every step meaning two things, and a consumer who widens grid columns through
`createTheme`'s `overrides` would move every page's width with them. The `CONTEXT.md` entries
**Column-width scale** and **Width scale** keep the two apart by name.

The size and spacing scales are ruled out for the reasons ADR-0022 gives for column widths: the
size scale holds the heights of things a pointer targets, and the spacing scale tops out at
`space-8`, `2rem`.

Like every other scale, a consumer reshapes the width scale through `createTheme`'s `overrides`,
and a step past `xl` is a new token in `theme.ts`, not a length on the prop.

## One component: Center

**The decision: `Center` is the one page-shell primitive. There is no `Container`.** ADR-0019
already reserves the name `Center` in its list of primitives, and `CONTEXT.md`'s **Layout
primitive** entry lists it. Capping width, centring with auto margins and padding the inline
edges are one job on one element; a `Container` doing the first and `Center` doing the second
would be two components a consumer nests every time, with nothing gained from the split.

## What is committed

- **`max` takes a bare step name** — `"sm"`, `"md"`, `"lg"` or `"xl"` — defaulting to `"lg"`.
  The bare name follows `Grid`'s `minColumnWidth`: the prop already says which scale it reads, so
  repeating the scale's prefix in the value (`"width-lg"`) adds nothing. The instance writes
  `--vpg-center-max` as the `var()` read of the step, under ADR-0019's naming.
- **`inset` sets the inline padding.** It takes a spacing-scale step or `"none"`, like every
  other length prop under ADR-0019, defaulting to `"space-4"`. The instance writes
  `--vpg-center-inset`. Padding applies on the inline axis only; block spacing belongs to whatever
  stacks the page's sections.
- **`box-sizing: border-box`, so `max` is the outer width.** The step names the width `Center`
  occupies, including its `inset`. Changing the inset moves the content's edges inward without
  making the page wider, and two `Center`s with the same `max` and different insets line up on
  their outer edges.
- **`intrinsic` is a boolean that toggles a class.** With it, `Center` becomes a flex column with
  `align-items: center`, so each child is centred at its own intrinsic width rather than
  stretched to the cap. It is a class, not a component-scoped property, because it switches a
  fixed group of declarations rather than carrying a value.

## Considered options

- **More steps on the column-width scale** (`--vpg-column-2xl` … up to `80rem`). Rejected because
  it mixes a floor and a ceiling in one family, as above: a step's meaning would depend on which
  component read it, and overriding grid columns would resize every page.
- **A separate `Container` component** for the width cap, with `Center` left to centring alone.
  Rejected because the two always appear together, ADR-0019 already reserves `Center` for this
  primitive, and two names for one job leave consumers choosing between them at every page.
- **`gutter` for the inline padding prop.** It is the name many layout libraries use. Rejected
  because `CONTEXT.md` lists *gutter* under the **Spacing scale**'s avoided terms, and because it
  is ambiguous between padding inside a container and the gap between grid columns. `inset` is
  the word `CONTEXT.md` already uses for padding a component takes from the spacing scale.
- **Prefixed step names on `max`** (`max="width-lg"`). Rejected for consistency with `Grid`'s
  `minColumnWidth`, which takes `"sm"` … `"xl"` bare.
- **`box-sizing: content-box`, so `max` caps the content and the inset adds to it.** Rejected
  because the rendered width would then depend on two props, and a `Center` with a larger inset
  would grow wider than its neighbour at the same step.
