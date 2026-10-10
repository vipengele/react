import type { Ref } from "react";
import { CartesianGrid, Legend, Line, LineChart as RechartsLineChart, Tooltip, type TooltipContentProps, XAxis, YAxis } from "recharts";
import { ThemedChartContainer } from "../ThemedChartContainer/ThemedChartContainer.js";
import { lineChartStylesheet } from "./LineChart.stylesheet.js";

/**
 * One sample: the x value under `xKey` and each series' value under its own `key`. A `null` or
 * missing series value is a gap in that series.
 */
export type LineChartRow = Readonly<Record<string, number | null | undefined>>;

/** One of the theme's six series colour roles, `--vpg-chart-1` to `--vpg-chart-6`. */
export type LineChartColorIndex = 1 | 2 | 3 | 4 | 5 | 6;

/** A line drawn from `data`. */
export interface LineChartSeries {
  /** The row field this series reads its values from. */
  readonly key: string;
  /** The name the legend and the tooltip show for this series. */
  readonly label: string;
  /** Pins the series to one colour role; by default series `i` takes role `(i % 6) + 1`. */
  readonly colorIndex?: LineChartColorIndex;
}

/**
 * How the x axis reads its values: `"number"` for plain numbers, `"time"` for epoch
 * milliseconds.
 */
export type LineChartXKind = "number" | "time";

/** Formats an x value for an axis tick. */
export type LineChartXFormatter = (x: number) => string;

/** Formats a y value for an axis tick. */
export type LineChartYFormatter = (y: number) => string;

/** Formats the x value heading the tooltip. */
export type LineChartTooltipLabelFormatter = (x: number) => string;

/** Formats one series' value in the tooltip. */
export type LineChartTooltipValueFormatter = (value: number, series: LineChartSeries) => string;

export interface LineChartProps {
  data: readonly LineChartRow[];
  /** The row field holding each sample's x value. */
  xKey: string;
  series: readonly LineChartSeries[];
  /** Defaults to `"number"`. */
  xKind?: LineChartXKind;
  /** A pixel count, or a percentage of a parent of definite height. */
  height?: number | `${number}%`;
  /** Derives the height from the width: `width / aspect`. */
  aspect?: number;
  /** Defaults to the number as written, or for `"time"` a time of day (a date when the data spans more than a day). */
  formatX?: LineChartXFormatter;
  /** Defaults to the number as written. */
  formatY?: LineChartYFormatter;
  /** Defaults to `formatX`, or for `"time"` the full local date and time. */
  formatTooltipLabel?: LineChartTooltipLabelFormatter;
  /** Defaults to `formatY`. */
  formatTooltipValue?: LineChartTooltipValueFormatter;
  /** Draws each line straight across missing samples rather than leaving a gap. Defaults to `false`. */
  connectGaps?: boolean;
  className?: string;
  /** Reaches the chart's outermost element. */
  ref?: Ref<HTMLDivElement>;
}

const DAY_MS = 86_400_000;

function seriesColor(series: LineChartSeries, index: number): string {
  return `var(--vpg-chart-${series.colorIndex ?? (index % 6) + 1})`;
}

/** Spans the x values in `data`, or `0` for data with fewer than two of them. */
function xSpan(data: readonly LineChartRow[], xKey: string): number {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (const row of data) {
    const x = row[xKey];
    if (typeof x !== "number") continue;
    min = Math.min(min, x);
    max = Math.max(max, x);
  }
  return max > min ? max - min : 0;
}

function defaultTimeTick(span: number): LineChartXFormatter {
  if (span > DAY_MS) return (x) => new Date(x).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return (x) => new Date(x).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: false });
}

const formatNumber = (value: number) => String(value);

/** A short line in the series' colour, standing for it in the legend and the tooltip. */
function Swatch({ color }: { color: string }) {
  return (
    <svg className="vpg-chart-swatch" viewBox="0 0 12 12" aria-hidden="true">
      <line x1={0} y1={6} x2={12} y2={6} stroke={color} strokeWidth={2} />
    </svg>
  );
}

/**
 * A multi-series line chart, themed from `@vipengele/react-tokens` and rendered into a
 * `<ThemedChartContainer>`.
 *
 * Series `i` is drawn in `--vpg-chart-${(i % 6) + 1}` unless its `colorIndex` pins a role, and the
 * legend and tooltip name every series by its `label`, so a series is never told apart by colour
 * alone (ADR-0030). Axes, grid and text take the container's ink and border, so the chart follows
 * the theme and its colour mode inside a `ThemeProvider`. Nothing animates.
 *
 * The chart's classes are `vpg-chart-*`; the DOM beneath them is not part of the contract.
 */
export function LineChart({
  data,
  xKey,
  series,
  xKind = "number",
  height,
  aspect,
  formatX,
  formatY,
  formatTooltipLabel,
  formatTooltipValue,
  connectGaps = false,
  className,
  ref,
}: LineChartProps) {
  const isTime = xKind === "time";
  const tickX = formatX ?? (isTime ? defaultTimeTick(xSpan(data, xKey)) : formatNumber);
  const tickY = formatY ?? formatNumber;
  const tooltipLabel = formatTooltipLabel ?? (isTime && !formatX ? (x: number) => new Date(x).toLocaleString() : tickX);
  const tooltipValue: LineChartTooltipValueFormatter = formatTooltipValue ?? ((value) => tickY(value));
  const classes = ["vpg-chart-line", className].filter(Boolean).join(" ");

  // Lists the series in their own order, leaving out any with no value at the active sample.
  const renderTooltip = ({ active, payload, label }: TooltipContentProps) => {
    if (!active) return null;
    const values = new Map(payload.map((item) => [String(item.dataKey), item.value]));
    const items = series.flatMap((entry, index) => {
      const value = values.get(entry.key);
      return typeof value === "number" ? [{ entry, index, value }] : [];
    });
    if (items.length === 0) return null;
    return (
      <div className="vpg-chart-tooltip">
        <p className="vpg-chart-tooltip-label">{tooltipLabel(Number(label))}</p>
        <ul className="vpg-chart-tooltip-items">
          {items.map(({ entry, index, value }) => (
            <li key={entry.key} className="vpg-chart-tooltip-item">
              <Swatch color={seriesColor(entry, index)} />
              <span>{entry.label}</span>
              <span className="vpg-chart-tooltip-value">{tooltipValue(value, entry)}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  const renderLegend = () => (
    <ul className="vpg-chart-legend">
      {series.map((entry, index) => (
        <li key={entry.key} className="vpg-chart-legend-item">
          <Swatch color={seriesColor(entry, index)} />
          <span>{entry.label}</span>
        </li>
      ))}
    </ul>
  );

  return (
    <>
      {/*
        React 19 hoists and de-duplicates this by `href`, so N charts on a page inject one
        stylesheet.
      */}
      <style href="vpg-chart-line" precedence="vpg-chart-line">
        {lineChartStylesheet}
      </style>
      <ThemedChartContainer ref={ref} className={classes} height={height} aspect={aspect}>
        {/* Recharts' `data` is a mutable array type; the chart never writes to it. */}
        <RechartsLineChart data={data as LineChartRow[]} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
          <CartesianGrid stroke="var(--vpg-border)" strokeDasharray="3 3" />
          <XAxis
            dataKey={xKey}
            type="number"
            scale={isTime ? "time" : "auto"}
            domain={["dataMin", "dataMax"]}
            tickFormatter={(x: number) => tickX(x)}
            stroke="currentColor"
            tick={{ fill: "currentColor" }}
            minTickGap={48}
            tickMargin={8}
          />
          <YAxis width={48} tickFormatter={(y: number) => tickY(y)} stroke="currentColor" tick={{ fill: "currentColor" }} />
          <Tooltip content={renderTooltip} cursor={{ stroke: "var(--vpg-border)" }} isAnimationActive={false} />
          <Legend content={renderLegend} />
          {series.map((entry, index) => (
            <Line
              key={entry.key}
              type="monotone"
              dataKey={entry.key}
              name={entry.label}
              stroke={seriesColor(entry, index)}
              strokeWidth={1.75}
              dot={false}
              connectNulls={connectGaps}
              isAnimationActive={false}
            />
          ))}
        </RechartsLineChart>
      </ThemedChartContainer>
    </>
  );
}
