# @vipengele/react-charts

Themeable React charts, colored and sized from the `@vipengele/react-tokens` theme.

## Install

```bash
pnpm add @vipengele/react-charts @vipengele/react-tokens react react-dom
```

Peer dependencies: React 19, React DOM 19 and `@vipengele/react-tokens` `^0.2.0`. The tokens
package supplies the `--vpg-chart-1` to `--vpg-chart-6` series colours and the ink and border
tokens the chart reads, so render charts inside its `ThemeProvider`. The charting library and
`react-is` are regular dependencies; there is nothing more to install.

The package exports `LineChart` and `AreaChart`. They share one set of props, listed under
`LineChart`; `AreaChart` adds `zeroLine`, and both take `connectGaps`. Zoom, status and colour work
the same in both.

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
| `series`             | `readonly { key, label, colorIndex? }[]`              | required                                     |
| `xKind`              | `"number" \| "time"` (`"time"` is epoch milliseconds) | `"number"`                                   |
| `height`             | `number \| \`${number}%\``                            | the parent's height                          |
| `aspect`             | `number`, height is `width / aspect`                  | none                                         |
| `formatX`            | `(x: number) => string`                               | the number; a time of day or date for `"time"` |
| `formatY`            | `(y: number) => string`                               | the number                                   |
| `formatTooltipLabel` | `(x: number) => string`                               | `formatX`; full local date and time for `"time"` |
| `formatTooltipValue` | `(value: number, series) => string`                   | `formatY`                                    |
| `connectGaps`        | `boolean`, draw across missing samples                | `false`                                      |
| `status`             | `"ready" \| "loading" \| "empty" \| "error"`          | `"ready"`                                    |
| `messages`           | `{ loading?, empty?, error?, resetZoom? }`            | English text, `"Reset zoom"`                 |
| `zoom`               | `{ start: number; end: number } \| null`              | all of `data`                                |
| `onZoomChange`       | `(zoom: { start, end } \| null) => void`              | none                                         |
| `className`          | `string`                                              | none                                         |
| `ref`                | `Ref<HTMLDivElement>`, the outermost element          | none                                         |

A row maps field names to numbers. A `null` or missing series value is a gap in that series.
The chart fills its parent's width and takes its height from `height`, else from `aspect`, else
from the parent. Nothing animates.

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

### Status

Any `status` but `"ready"` shows its message at the chart's size and renders no chart: `"loading"`,
`"empty"` and `"error"` (announced as an alert). `messages` replaces the text.

### Colour

Series `i` takes `--vpg-chart-((i % 6) + 1)` unless `colorIndex` pins a role from 1 to 6. The
legend and the tooltip name every series by its `label`, so colour is never the only channel.

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

## The charting library is an implementation detail

No Recharts type, element, prop or event crosses this package's public API. The DOM below the
`.vpg-chart-*` classes, including any `recharts-*` classes, is not part of the contract. The
library can be replaced without a breaking release.
