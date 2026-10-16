import type { ReactElement, ReactNode } from "react";
import { CartesianGrid, Legend, Tooltip, XAxis, YAxis } from "recharts";
import { ChartMessage } from "../ChartMessage/ChartMessage.js";
import { chartStylesheet } from "../chartStylesheet.js";
import { chartFormatters } from "../formatters.js";
import { SeriesLegend, seriesTooltip } from "../SeriesKey/SeriesKey.js";
import { ThemedChartContainer } from "../ThemedChartContainer/ThemedChartContainer.js";
import type { CartesianChartProps, ChartRow } from "../types.js";
import { rowsInZoom } from "../zoom/rowsInZoom.js";
import { ZoomLayer } from "../zoom/ZoomLayer.js";
import { yAxisTick } from "../YAxisTick/YAxisTick.js";

/**
 * The space above the plot, in pixels. The first y tick sits on the plot's top edge, and a
 * two-line tick rises half a line above its gridline: 14px holds the value line of a 12px tick
 * inside the surface, where 8px would clip its top.
 */
const PLOT_TOP = 14;

/** The Recharts root chart component a frame draws into, such as Recharts' `LineChart`. */
export type CartesianChartRoot = (props: {
  data: ChartRow[];
  margin: { top: number; right: number; bottom: number; left: number };
  children: ReactNode;
}) => ReactElement;

/**
 * How the frame lays out the x axis. `"number"` spans the data edge to edge, with drag-to-zoom.
 * `"band"` gives each distinct x value a slot of its own, with a tick at its centre, for marks
 * drawn as a width around their x value, such as bars; it neither zooms nor shows a reset control.
 */
export type CartesianChartAxis = "number" | "band";

/** The x domain and ticks of a band axis. */
export interface BandAxis {
  readonly domain: readonly [number, number];
  readonly ticks: readonly number[];
}

/**
 * A gap at or below this fraction of the widest gap between neighbouring x values is a
 * near-coincidence, not a step. Recharts sizes a bar on a numeric axis from the smallest gap above
 * the same fraction, so a step taken from a smaller gap would pad the axis less than half a bar.
 */
const COINCIDENT_GAP = 1e-4;

/**
 * Lays out a band axis over the finite x values in `data`: one tick per distinct value, ascending
 * whatever the rows' order, and the domain padded by half a step at each end, so the first and last
 * marks sit wholly inside the plot. The step is the smallest gap between neighbouring values that
 * is not a near-coincidence, which is the width Recharts gives a bar's slot; a single value takes a
 * step of 1 and sits centred. `null` when no row has a finite x value.
 */
export function bandAxis(data: readonly ChartRow[], xKey: string): BandAxis | null {
  const distinct = new Set<number>();
  for (const row of data) {
    const x = row[xKey];
    if (Number.isFinite(x)) distinct.add(x as number);
  }
  const ticks = [...distinct].sort((a, b) => a - b);
  if (ticks.length === 0) return null;
  // Folded rather than spread into `Math.max`/`Math.min`, which overflow the stack on long data.
  const gaps = ticks.slice(1).map((x, index) => x - (ticks[index] as number));
  const widest = gaps.reduce((max, gap) => Math.max(max, gap), 0);
  const step = gaps.reduce((min, gap) => (gap > widest * COINCIDENT_GAP ? Math.min(min, gap) : min), Number.POSITIVE_INFINITY);
  const half = (Number.isFinite(step) ? step : 1) / 2;
  return { domain: [(ticks[0] as number) - half, (ticks.at(-1) as number) + half], ticks };
}

export interface CartesianChartFrameProps extends CartesianChartProps {
  /** How the x axis is laid out. Defaults to `"number"`. */
  axis?: CartesianChartAxis;
  /** The Recharts root chart the series marks belong to. */
  root: CartesianChartRoot;
  /** The chart type's own class on the container, alongside `vpg-chart-container` and `className`. */
  chartClassName: string;
  /** The series marks, drawn above the grid, axes, tooltip and legend and beneath the zoom layer. */
  children: ReactNode;
}

/**
 * Everything a cartesian chart draws around its series marks: the themed container, the grid, the
 * x and y axes with their formatters, the tooltip and, unless `legend` is `false`, the legend naming
 * every series by its label, the drag-to-zoom layer and its reset control, and the message that
 * replaces the chart for any status but `"ready"`. The chart type supplies only its Recharts root and the marks, as `children`.
 * Every chart type's styles are the shared `chartStylesheet`, injected under the one `vpg-chart`
 * key whatever mix of chart types a page renders.
 *
 * With a `zoom`, only the rows within it reach the root, the x domain is pinned to it, and a time
 * axis picks its default tick format from the zoomed span. The zoom layer is given the unzoomed
 * `data`, so a drag in progress is discarded when `data` changes and never because `zoom` does.
 *
 * With `axis="band"` the x axis is a band axis (see `bandAxis`): every row reaches the root, `zoom`
 * is ignored, and neither the zoom layer nor the reset control is mounted, so `onZoomChange` is
 * never called. Without a finite x value in `data`, a band axis spans the data like a numeric one.
 */
export function CartesianChartFrame({
  root: Root,
  axis = "number",
  chartClassName,
  children,
  data,
  xKey,
  series,
  legend = true,
  xKind = "number",
  height,
  aspect,
  formatX,
  formatY,
  formatTooltipLabel,
  formatTooltipValue,
  status = "ready",
  messages,
  zoom: zoomProp,
  onZoomChange,
  className,
  ref,
}: CartesianChartFrameProps) {
  const isBand = axis === "band";
  const zoom = isBand ? null : zoomProp;
  const band = isBand ? bandAxis(data, xKey) : null;
  const isTime = xKind === "time";
  const rows = zoom ? rowsInZoom(data, xKey, zoom) : data;
  const { tickX, tickY, tooltipLabel, tooltipValue } = chartFormatters({
    isTime,
    rows,
    xKey,
    formatX,
    formatY,
    formatTooltipLabel,
    formatTooltipValue,
  });
  const classes = [chartClassName, className].filter(Boolean).join(" ");
  const renderTooltip = seriesTooltip({ series, formatLabel: tooltipLabel, formatValue: tooltipValue });
  const renderLegend = () => <SeriesLegend series={series} />;

  const style = (
    <>
      {/*
        React 19 hoists and de-duplicates this by `href`, so N charts on a page, of whichever
        types, inject one stylesheet.
      */}
      <style href="vpg-chart" precedence="vpg-chart">
        {chartStylesheet}
      </style>
    </>
  );

  if (status !== "ready") {
    return (
      <>
        {style}
        <ChartMessage ref={ref} status={status} messages={messages} height={height} aspect={aspect} className={className} />
      </>
    );
  }

  return (
    <>
      {style}
      <ThemedChartContainer ref={ref} className={classes} height={height} aspect={aspect}>
        {/* Recharts' `data` is a mutable array type; the chart never writes to it. */}
        <Root data={rows as ChartRow[]} margin={{ top: PLOT_TOP, right: 8, bottom: 0, left: 8 }}>
          <CartesianGrid stroke="var(--vpg-border)" strokeDasharray="3 3" />
          <XAxis
            dataKey={xKey}
            type="number"
            scale={isTime ? "time" : "auto"}
            domain={band ? [...band.domain] : zoom ? [zoom.start, zoom.end] : ["dataMin", "dataMax"]}
            ticks={band ? [...band.ticks] : undefined}
            allowDataOverflow={Boolean(zoom)}
            tickFormatter={(x: number) => tickX(x)}
            stroke="currentColor"
            tick={{ fill: "currentColor" }}
            minTickGap={48}
            tickMargin={8}
          />
          <YAxis width={48} stroke="currentColor" tick={yAxisTick(tickY)} />
          <Tooltip content={renderTooltip} cursor={{ stroke: "var(--vpg-border)" }} isAnimationActive={false} />
          {legend ? <Legend content={renderLegend} /> : null}
          {children}
          {isBand ? null : <ZoomLayer data={data} onZoomChange={onZoomChange} />}
        </Root>
        {zoom ? (
          <button type="button" className="vpg-chart-zoom-reset" onClick={() => onZoomChange?.(null)}>
            {messages?.resetZoom ?? "Reset zoom"}
          </button>
        ) : null}
      </ThemedChartContainer>
    </>
  );
}
