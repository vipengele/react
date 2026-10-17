# @vipengele/react-charts

Themeable React charts, colored and sized from the `@vipengele/react-tokens` theme.

## Install

```bash
pnpm add @vipengele/react-charts @vipengele/react-tokens react react-dom
```

Peer dependencies: React 19, React DOM 19 and `@vipengele/react-tokens` `^0.3.0`. The tokens
package supplies the `--vpg-chart-1` to `--vpg-chart-6` series colours, the status colours
(`--vpg-success`, `--vpg-danger`, `--vpg-warning`, `--vpg-info`) and the ink and border
tokens the chart reads, so render charts inside its `ThemeProvider`. The charting library and
`react-is` are regular dependencies; there is nothing more to install.

The package exports `LineChart`, `AreaChart` and `StackedBarChart`. They share one set of props,
listed under `LineChart`; `AreaChart` adds `zeroLine`, both take `connectGaps`, and
`StackedBarChart` has no zoom. Status and colour work the same in all three. `legend={false}` drops
the legend, and the tooltip still names every series.

## LineChart

```tsx
import { LineChart } from "@vipengele/react-charts";

const series = [
  { key: "cpu", label: "CPU" },
  { key: "memory", label: "Memory", colorIndex: 4 },
] as const;

<LineChart data={rows} xKey="at" xKind="time" series={series} aspect={2} />;
```

| Prop                 | Type                                                  | Default                                      |
| -------------------- | ----------------------------------------------------- | -------------------------------------------- |
| `data`               | `readonly LineChartRow[]`                             | required                                     |
| `xKey`               | `string`, the row field holding each x value          | required                                     |
| `series`             | `readonly { key, label, color?, colorIndex? }[]`      | required                                     |
| `xKind`              | `"number" \| "time"` (`"time"` is epoch milliseconds) | `"number"`                                   |
| `height`             | `number \| \`${number}%\``                            | the parent's height                          |
| `aspect`             | `number`, height is `width / aspect`                  | none                                         |
| `formatX`            | `(x: number) => string`                               | the number; a time of day or date for `"time"` |
| `formatY`            | `(y: number) => string \| [value, unit]`              | the number                                   |
| `formatTooltipLabel` | `(x: number) => string`                               | `formatX`; full local date and time for `"time"` |
| `formatTooltipValue` | `(value: number, series) => string`                   | `formatY`, a pair as `"value unit"`          |
| `legend`             | `boolean`, show the legend beneath the plot           | `true`                                       |
| `connectGaps`        | `boolean`, draw across missing samples                | `false`                                      |
| `referenceLines`     | `readonly { y, label? }[]`                            | none                                         |
| `gaps`               | `readonly { start, end, label }[]`                    | none                                         |
| `markers`            | `readonly { x, label }[]`                             | none                                         |
| `renderTooltipDetail` | `(point: { x, row }) => ReactNode`                   | none                                         |
| `status`             | `"ready" \| "loading" \| "empty" \| "error"`          | `"ready"`                                    |
| `messages`           | `{ loading?, empty?, error?, resetZoom? }`            | English text, `"Reset zoom"`                 |
| `zoom`               | `{ start: number; end: number } \| null`              | all of `data`                                |
| `onZoomChange`       | `(zoom: { start, end } \| null) => void`              | none                                         |
| `className`          | `string`                                              | none                                         |
| `ref`                | `Ref<HTMLDivElement>`, the outermost element          | none                                         |

A row maps field names to numbers. A `null` or missing series value is a gap in that series.
The chart fills its parent's width and takes its height from `height`, else from `aspect`, else
from the parent. Nothing animates.

### Y ticks on two lines

`formatY` returns a string for a one-line tick, or a `[value, unit]` pair to put the unit on a
second line beneath the value. Both lines are right-aligned against the axis and centred together
on the tick's gridline. Without `formatTooltipValue`, the tooltip writes a pair on one line, the
value and the unit a space apart.

```tsx
<AreaChart
  data={rows}
  xKey="at"
  series={series}
  formatY={(y) => [String(Math.abs(y)), "Mbit/s"]}
/>;
```

The y axis is 48px wide. A value or unit longer than that is clipped, so keep each line short.

### Zoom

Zoom is controlled. Dragging across the plot selects a range; `onZoomChange` fires once, on
release, with `{ start, end }` in x values (epoch milliseconds for `"time"`). The reset control,
shown while `zoom` is set, calls it with `null`. A press without a drag, `Escape` or the pointer
leaving the plot ends the drag without calling it. The chart never changes `zoom` itself.

With `zoom` set, only samples inside the range are drawn. Several charts given the same `zoom` and
`onZoomChange` zoom together.

```tsx
const [zoom, setZoom] = useState<LineChartZoom | null>(null);
<LineChart data={rows} xKey="at" series={series} zoom={zoom} onZoomChange={setZoom} />;
```

An in-progress drag is discarded when the identity of the `data` array changes. Keep `data`
referentially stable between renders (memoise it), or an unrelated re-render cancels the drag.

### Annotations

`referenceLines`, `gaps` and `markers` annotate the plot. Their colours are fixed theme tokens and
cannot be set by the caller. None of them captures the pointer, so the tooltip and the drag to zoom
work across them. Their item types are not exported; with `LineChartProps` (or `AreaChartProps`)
imported, `LineChartProps["gaps"]` reaches the array type and
`NonNullable<LineChartProps["gaps"]>[number]` an item.

`referenceLines` draws a horizontal line across the plot at each `y`, named by its `label` when it
has one, above the series. The y axis grows to take in every line, so a line above or below the data
is still visible.

```tsx
<LineChart data={rows} xKey="at" series={series} referenceLines={[{ y: 90, label: "Limit" }]} />
```

`gaps` shades an x range (`start` to `end`, epoch milliseconds for `"time"`) across the full height
of the plot, named by its `label`, beneath the series. A gap is clipped to the visible x range, the
`zoom` or else all of `data`, and one wholly outside it is not drawn.

```tsx
<LineChart data={rows} xKey="at" xKind="time" series={series} gaps={[{ start: t0, end: t1, label: "Outage" }]} />
```

`markers` draws a vertical line across the full height of the plot at each `x`, named by its
`label`, above the series. A marker outside the visible x range is not drawn; one exactly on either
edge is.

```tsx
<LineChart data={rows} xKey="at" xKind="time" series={series} markers={[{ x: deployedAt, label: "Deploy" }]} />
```

The z-order, bottom to top: gaps, the series, reference lines, markers.

### Tooltip detail

`renderTooltipDetail` adds content to the tooltip beneath its heading and series values, never in
their place. It is called with the active sample's `x` and its `row`, looked up among the rows the
chart shows by their `xKey` value, or `undefined` when none has it. The tooltip also shows at a
sample where every series is `null` whenever the function returns content, so a gap in the data can
be explained where it occurs; the heading then stands above the content alone. `null`, `undefined`,
booleans and the empty string are no content, while `0` is.

```tsx
<LineChart
  data={rows}
  xKey="at"
  series={series}
  renderTooltipDetail={({ row }) => (row ? null : "No samples")}
/>
```

### Status

Any `status` but `"ready"` shows its message at the chart's size and renders no chart: `"loading"`,
`"empty"` and `"error"` (announced as an alert). `messages` replaces the text.

### Colour

Series `i` takes `--vpg-chart-((i % 6) + 1)` unless `colorIndex` pins a role from 1 to 6 or `color`
names a role. `color` is one of `"chart-1"` to `"chart-6"`, `"success"`, `"danger"`, `"warning"`,
`"info"` or `"neutral"`, and takes precedence over `colorIndex`. Each reads its theme property bare,
so it follows the colour mode. The status roles need `@vipengele/react-tokens` 0.3.0 or later.

`"neutral"` is drawn in the text colour (`--vpg-ink`): the theme has no neutral role, and its other
neutral greys are translucent, so gridlines would show through a bar or area. Use it for a series
that stands apart, such as a remainder, and expect it to be as strong as the text.

The theme rotates its six series colours' hue from the accent. The status roles and `"neutral"` sit
outside that rotation, so a series pinned to a status role keeps its meaning whatever the accent.

The legend and the tooltip name every series by its `label`, so colour is never the only channel.

## AreaChart

```tsx
import { AreaChart } from "@vipengele/react-charts";

const series = [
  { key: "download", label: "Download" },
  { key: "upload", label: "Upload" },
] as const;

// Upload is passed as negative values, so it fills below the zero line.
<AreaChart
  data={rows}
  xKey="at"
  xKind="time"
  series={series}
  formatY={(y) => `${Math.abs(y)} Mbit/s`}
  aspect={2}
/>;
```

`AreaChart` takes every prop in the table above, plus:

| Prop       | Type      | Default |
| ---------- | --------- | ------- |
| `zeroLine` | `boolean` | `true`  |

Areas are not stacked. Each series fills between its values and zero, and the areas overlap. A
mirrored pair, such as download and upload with upload given as negative values, sits either side of
the zero line; `formatY` can show the magnitude on both sides, as above. The caller supplies the
sign.

The outline is the series' opaque role colour. The fill is the same colour at 20% opacity, a
chart-local transparency and not a token. The zero line reads `--vpg-border-strong` and is drawn
only while the visible y range strictly spans zero, so it follows zoom. `zeroLine={false}` turns it
off.

`zeroLine` and `referenceLines` are independent. A `referenceLines` entry at `y: 0` draws alongside
the zero line, which stays. A reference line extends the y axis, so one
below positive data (or above negative data) makes the range span zero, and the zero line then
appears.

## StackedBarChart

```tsx
import { StackedBarChart } from "@vipengele/react-charts";

const series = [
  { key: "passed", label: "Passed", color: "success" },
  { key: "failed", label: "Failed", color: "danger" },
  { key: "skipped", label: "Skipped", color: "neutral" },
] as const;

const rows = [
  { run: 101, passed: 48, failed: 2, skipped: 1 },
  { run: 102, passed: 50, failed: null, skipped: 0 },
  { run: 103, passed: 45, failed: 6 },
];

<StackedBarChart data={rows} xKey="run" series={series} formatX={(run) => `#${run}`} aspect={2} />;
```

`StackedBarChart` takes the props in the table above except `zoom` and `onZoomChange`, and its
`messages` has no `resetZoom`. It draws stacked bars of counts: each distinct x value, a run number
or a timestamp (`xKind="time"`), is a category with one bar, centred on a tick labelled through
`formatX`. The series stack in their order, bottom first, in one bar per category.

A `null`, missing or `0` value adds no segment to its bar. A category with no value in any series
draws no bar but keeps its tick. A bar is at most 48px wide and narrows as categories crowd the
plot; a single category still draws a bar. Categories are ordered by x whatever the order of
`data`.

There is no zoom and no reset control. `status`, `messages`, `legend`, `formatY`,
`formatTooltipLabel`, `formatTooltipValue` and `renderTooltipDetail` work as for `LineChart`.
`empty` is set by the caller through `status`, never inferred from `data`.

`referenceLines`, `markers` and `gaps` are drawn as for the other charts. The x axis runs half a
category step beyond the first and last x value, and `markers` and `gaps` are clipped to that
axis, so one in the outer half step is drawn. A reference line extends the y axis.

## The charting library is an implementation detail

No Recharts type, element, prop or event crosses this package's public API. The DOM below the
`.vpg-chart-*` classes, including any `recharts-*` classes, is not part of the contract. The
library can be replaced without a breaking release.
