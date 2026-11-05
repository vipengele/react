# react-charts v1.0.0

The first release of `@vipengele/react-charts`: themeable React charts, coloured and sized from the
`@vipengele/react-tokens` theme. From this release the public API follows semver.

```bash
pnpm add @vipengele/react-charts @vipengele/react-tokens react react-dom
```

Peer dependencies are React 19, React DOM 19 and `@vipengele/react-tokens` `^1.0.0`. The
charts read the tokens' series, status, ink and border colours, so render them inside its
`ThemeProvider`, or inside `<Vipengele>` from `@vipengele/react`. `react-charts` versions
separately from `react-ui`. It needs only a tokens release on that range, not a matching
`react-ui` version.

## Charts

- **`LineChart`**: one line per series over a `"number"` or `"time"` (epoch milliseconds) x axis.
- **`AreaChart`**: the same props plus `zeroLine`. Areas are not stacked: each series fills
  between its values and zero, so a mirrored pair such as download and upload sits on either side
  of the zero line.
- **`StackedBarChart`**: stacked bars of counts, one bar per distinct x value, with the series
  stacked in order. It takes the same props except `zoom` and `onZoomChange`.

All three share one set of props and behaviour:

- **Sizing.** A chart fills its parent's width and takes its height from `height`, else from
  `aspect`, else from the parent.
- **Formatting.** `formatX`, `formatY`, `formatTooltipLabel` and `formatTooltipValue`. `formatY`
  can return a `[value, unit]` pair to put the unit on a second tick line.
- **Gaps in the data.** A `null` or missing value is a gap in that series. `connectGaps` draws
  across it on the line and area charts.
- **Colour.** Series `i` takes `--vpg-chart-((i % 6) + 1)`. `colorIndex` pins one of the six
  series colours, and `color` names a role: `"chart-1"` to `"chart-6"`, `"success"`, `"danger"`,
  `"warning"`, `"info"` or `"neutral"`. The legend and tooltip name every series by its `label`,
  so colour is never the only channel. `legend={false}` drops the legend.
- **Annotations.** `referenceLines` (horizontal lines at a `y`), `gaps` (a shaded x range) and
  `markers` (vertical lines at an `x`). Each is named by its label and drawn in fixed theme
  tokens.
- **Tooltip detail.** `renderTooltipDetail` adds the caller's content beneath the tooltip's
  values for the active sample.
- **Status.** `status` is `"ready"`, `"loading"`, `"empty"` or `"error"`. Any status other than
  `"ready"` shows its message at the chart's size, and `messages` replaces the text.
- **Zoom.** On the line and area charts, zoom is controlled: dragging across the plot reports a
  range through `onZoomChange`, and a reset control clears it. Charts given the same `zoom` zoom
  together.

The charting library is an implementation detail. No Recharts type, element, prop or event is
part of the public API, and the DOM below the `.vpg-chart-*` classes is not part of the contract.
