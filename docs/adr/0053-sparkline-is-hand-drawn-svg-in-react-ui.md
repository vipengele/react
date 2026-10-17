---
status: accepted
---

# Sparkline is hand-drawn SVG in react-ui

`Sparkline` is exported from `@vipengele/react-ui` (`source/react-ui/packages/ui`) and draws its line
with inline SVG, without a charting dependency. It is a small axis-less line with an area fill and an
emphasised end point, for tiles and table cells; the `visual` slot of `StatTile` is where it is
expected to sit. This records where it lives, how it is drawn, how it takes its colour and how it is
named for assistive technology. It is issue #200, a sub-issue of epic #198.

## Context

A sparkline shows the shape of a series next to a number and nothing else: no axes, no legend, no
zoom, no tooltip. Two homes were possible, `react-ui` and `react-charts`, and two ways to draw it,
Recharts and hand-written SVG. The placement fixes a public package, a dependency graph and a set of
tokens, and is costly to move once consumers import it.

## Decision

**`Sparkline` lives in `react-ui`.** The chart frame of `react-charts` is built around axes, a legend
and zoom, and its container draws an outline that would box a table cell. A sparkline needs none of
that. `react-ui` already draws inline SVG so that it reads the theme (ADR-0018), and a sparkline is
one more such drawing.

**It is hand-drawn SVG.** The line is one polyline per run of present values, and the area is one
path per run. Recharts brings a store and d3 for what is a single polyline, and `react-ui` takes no
charting dependency.

**Geometry avoids measuring.** The `<svg>` is `width: 100%` with a fixed pixel height, 32 by default.
It uses `preserveAspectRatio="none"` and `vector-effect: non-scaling-stroke`, so the shape stretches
to the width it is given while the stroke stays 1.5px, and no `ResizeObserver` is needed. The end
point is a separate absolutely positioned element placed by percentage, because a `<circle>` under
`preserveAspectRatio="none"` would stretch into an ellipse.

**Values may be absent.** An entry that is `null`, `undefined` or not finite is absent. Absent values
split the line into segments, so a gap in the data is a gap in the drawing and is never interpolated.
The end point is the last present value.

**Tone selects the colour.** The tones are `neutral | success | warning | info | danger`, the members
of `StatTileTone`, mapped to `--vpg-ink-muted`, `--vpg-success`, `--vpg-warning`, `--vpg-info` and
`--vpg-danger`. The stroke, the area wash and the end point read that one colour. No token is added
and no `var()` read carries a fallback (ADR-0009).

**The warning tone is under glyph contrast on a light surface (ADR-0033).** `--vpg-warning` does not
reach the contrast a text glyph needs against a light ground. The drawing stays legible through a
1.5px stroke, a wash area fill and the end-point dot, which are graphical marks with a lower
threshold than text. The trend is never carried by colour: the accessible name states it.

**The accessible name is generated.** The wrapper has `role="img"` and the `<svg>` is `aria-hidden`.
The generated text reads like "Trend: rising, from 12 to 31", with the numbers formatted by
`Intl.NumberFormat`. The direction compares the first and the last present values and is `rising`,
`falling` or `flat`. A series with no present value reads "No data". Three optional props adjust it:

- `label` is a prefix for the generated text.
- `summary` replaces the whole accessible text, so the generated "Trend: ..." text is not used.
- `decorative` removes the role and the name (`aria-hidden`, no role), for a sparkline whose
  neighbouring text already says what it shows.

## Consequences

- A consumer gets the sparkline from the package it already uses for the tile, and a table cell
  carries no chart frame.
- `react-ui` owns a small amount of geometry code, the segment splitting and the percentage
  placement of the end point, that a charting library would otherwise supply.
- The stretched shape means the curve is a function of the width it is given. A series drawn in a
  narrow cell and in a wide one has the same shape but a different slope.
- There is no hover value, axis or tick. A product that needs them uses `react-charts`.
- The warning tone leans on shape and on the accessible name, not on colour contrast, to be read.

## Considered options

- **A Sparkline in `react-charts` built on Recharts.** Rejected: the chart frame is built around
  axes, a legend and zoom, and its container draws an outline that would box a table cell. Recharts
  adds a store and d3 for one polyline, and a tile in `react-ui` would depend on a second project to
  show a line.
- **A hand-drawn Sparkline in `react-charts`.** Rejected: it drops the Recharts cost but keeps the
  frame and the outline, and it places a component meant for `StatTile` and table cells in a package
  whose scope is axes-and-legend charts. `react-ui` already draws inline SVG (ADR-0018).
- **A `<circle>` for the end point.** Rejected: under `preserveAspectRatio="none"` it stretches into
  an ellipse. A positioned element placed by percentage stays round.
- **Measuring the width with a `ResizeObserver` and drawing in pixels.** Rejected: it adds a client
  effect and a re-render on every resize for a result the non-scaling stroke already gives.
- **Interpolating across absent values.** Rejected: it draws data that was not observed. A gap is
  information.
