import { type CSSProperties, type Ref, useEffect, useLayoutEffect, useRef } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart as RechartsLineChart,
  Tooltip,
  type TooltipContentProps,
  usePlotArea,
  useXAxisInverseScale,
  XAxis,
  YAxis,
} from "recharts";
import { ThemedChartContainer } from "../internal/ThemedChartContainer/ThemedChartContainer.js";
import { lineChartStylesheet } from "./LineChart.stylesheet.js";
import { useZoom } from "./useZoom.js";

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

/** What the chart shows: the chart itself when `"ready"`, otherwise a message in its place. */
export type LineChartStatus = "ready" | "loading" | "empty" | "error";

/** Replaces the chart's default English text: the message shown for a status, and the reset control's label. */
export interface LineChartMessages {
  readonly loading?: string;
  readonly empty?: string;
  readonly error?: string;
  /** Labels the control that clears the zoom. Defaults to `"Reset zoom"`. */
  readonly resetZoom?: string;
}

/**
 * A range of the x axis, in x values (epoch milliseconds for `"time"`), with `start < end` when the
 * chart reports one.
 */
export interface LineChartZoom {
  readonly start: number;
  readonly end: number;
}

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
  /**
   * Any status but `"ready"` shows its message at the chart's size and mounts no chart. Defaults
   * to `"ready"`.
   */
  status?: LineChartStatus;
  /** Overrides the default text: the message per status, and the reset control's label. */
  messages?: LineChartMessages;
  /**
   * The x range the chart shows, or `null`/absent for all of `data`. Samples outside it are not
   * drawn. The chart never changes it itself: it reports a new one through `onZoomChange`.
   */
  zoom?: LineChartZoom | null;
  /**
   * Called once when a drag across the plot is released, with the range it covers, and with
   * `null` when the reset control is pressed. A press without a drag, `Escape` or the pointer
   * leaving the plot ends the drag without calling it.
   */
  onZoomChange?: (zoom: LineChartZoom | null) => void;
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
  return max > min ? max - min : 0; // [lydite:exclude_from_mutation][at max === min, max - min is 0 or NaN, and the only reader, span > DAY_MS, is false for both]
}

function defaultTimeTick(span: number): LineChartXFormatter {
  if (span > DAY_MS) return (x) => new Date(x).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return (x) => new Date(x).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: false });
}

const formatNumber = (value: number) => String(value);

/** Keeps the rows whose x value falls within `zoom`, inclusive. */
function rowsIn(data: readonly LineChartRow[], xKey: string, zoom: LineChartZoom): LineChartRow[] {
  return data.filter((row) => {
    const x = row[xKey];
    return typeof x === "number" && x >= zoom.start && x <= zoom.end;
  });
}

const DEFAULT_MESSAGES = {
  loading: "Loading chart",
  empty: "No data to show",
  error: "Could not load chart",
} as const satisfies Record<Exclude<LineChartStatus, "ready">, string>;

/** A short line in the series' colour, standing for it in the legend and the tooltip. */
function Swatch({ color }: { color: string }) {
  return (
    <svg className="vpg-chart-swatch" viewBox="0 0 12 12" aria-hidden="true">
      <line x1={0} y1={6} x2={12} y2={6} stroke={color} strokeWidth={2} />
    </svg>
  );
}

interface ZoomLayerProps {
  data: readonly LineChartRow[];
  onZoomChange: ((zoom: LineChartZoom | null) => void) | undefined;
}

/**
 * Drag-to-zoom over the plot, rendered inside the chart so it can read the plot area and invert
 * the x scale: pointer positions become x values here and nowhere else.
 *
 * The press is heard on the whole chart surface and tested against the plot area, rather than on
 * an overlay of its own, so that a line, an active dot or the tooltip cursor drawn over the plot
 * never swallows it. A press starts listening on the window for the moves and the release, so a
 * move that follows the press before React re-renders is not lost; a move outside the plot area,
 * `Escape` or a cancelled pointer ends the drag without reporting it.
 *
 * The listeners are attached once and read the plot and the drag handlers of the latest render
 * through a ref, so a re-render mid-drag never detaches them.
 */
function ZoomLayer({ data, onZoomChange }: ZoomLayerProps) {
  const plot = usePlotArea();
  const invert = useXAxisInverseScale();
  const layer = useRef<SVGGElement>(null);
  const zoom = useZoom({ data, toX: (px) => Number(invert?.(px)), onZoomChange });
  const latest = useRef({ plot, zoom });

  useLayoutEffect(() => {
    latest.current = { plot, zoom };
  });

  useEffect(() => {
    const surface = layer.current?.ownerSVGElement as SVGSVGElement;
    // Converts a pointer to the chart's coordinates, or `null` outside the plot area.
    const inPlot = (event: PointerEvent) => {
      const area = latest.current.plot;
      const box = surface.getBoundingClientRect();
      const x = event.clientX - box.left;
      const y = event.clientY - box.top;
      const inside = area !== undefined && x >= area.x && x <= area.x + area.width && y >= area.y && y <= area.y + area.height;
      return inside ? x : null;
    };
    const stop = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
      window.removeEventListener("keydown", onKey);
    };
    const onCancel = () => {
      stop();
      latest.current.zoom.cancel();
    };
    const onUp = () => {
      stop();
      latest.current.zoom.commit();
    };
    const onMove = (event: PointerEvent) => {
      const x = inPlot(event);
      if (x === null) onCancel();
      else latest.current.zoom.move(x);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    const onDown = (event: PointerEvent) => {
      const x = inPlot(event);
      if (event.button !== 0 || x === null) return;
      stop(); // [lydite:exclude_from_mutation][the DOM ignores re-adding an attached listener, so the four added below leave the same set attached either way]
      latest.current.zoom.begin(x);
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onCancel);
      window.addEventListener("keydown", onKey);
    };
    surface.addEventListener("pointerdown", onDown);
    return () => {
      surface.removeEventListener("pointerdown", onDown);
      stop();
    };
  }, []);

  const { band } = zoom;
  return (
    <g ref={layer} className="vpg-chart-zoom">
      {band && plot && band.to > band.from ? (
        <rect className="vpg-chart-zoom-selection" x={band.from} y={plot.y} width={band.to - band.from} height={plot.height} />
      ) : null}
    </g>
  );
}

/**
 * A multi-series line chart, themed from `@vipengele/react-tokens`. It fills its parent's width,
 * and takes its height from `height`, else from `aspect`, else from the parent.
 *
 * Series `i` is drawn in `--vpg-chart-${(i % 6) + 1}` unless its `colorIndex` pins a role, and the
 * legend and tooltip name every series by its `label`, so a series is never told apart by colour
 * alone (ADR-0030). Axes, grid and text take the theme's ink and border roles, so the chart
 * follows the theme and its colour mode inside a `ThemeProvider`. Nothing animates.
 *
 * Zoom is controlled: dragging across the plot reports a range through `onZoomChange`, and the
 * chart shows the range its `zoom` prop names, with a reset control while one is set. Several
 * charts given the same `zoom` and `onZoomChange` zoom together.
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
  status = "ready",
  messages,
  zoom,
  onZoomChange,
  className,
  ref,
}: LineChartProps) {
  const isTime = xKind === "time";
  const rows = zoom ? rowsIn(data, xKey, zoom) : data;
  const tickX = formatX ?? (isTime ? defaultTimeTick(xSpan(rows, xKey)) : formatNumber);
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

  const stylesheet = (
    <>
      {/*
        React 19 hoists and de-duplicates this by `href`, so N charts on a page inject one
        stylesheet.
      */}
      <style href="vpg-chart-line" precedence="vpg-chart-line">
        {lineChartStylesheet}
      </style>
    </>
  );

  if (status !== "ready") {
    // Takes the size the chart would: a height, else the aspect, else the parent's full height.
    const style: CSSProperties = { width: "100%", height: height ?? (aspect === undefined ? "100%" : undefined), aspectRatio: aspect };
    return (
      <>
        {stylesheet}
        <div ref={ref} className={["vpg-chart-message", className].filter(Boolean).join(" ")} style={style}>
          <p role={status === "error" ? "alert" : "status"} className="vpg-chart-message-text">
            {messages?.[status] ?? DEFAULT_MESSAGES[status]}
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      {stylesheet}
      <ThemedChartContainer ref={ref} className={classes} height={height} aspect={aspect}>
        {/* Recharts' `data` is a mutable array type; the chart never writes to it. */}
        <RechartsLineChart data={rows as LineChartRow[]} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
          <CartesianGrid stroke="var(--vpg-border)" strokeDasharray="3 3" />
          <XAxis
            dataKey={xKey}
            type="number"
            scale={isTime ? "time" : "auto"}
            domain={zoom ? [zoom.start, zoom.end] : ["dataMin", "dataMax"]}
            allowDataOverflow={Boolean(zoom)}
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
          <ZoomLayer data={data} onZoomChange={onZoomChange} />
        </RechartsLineChart>
        {zoom ? (
          <button type="button" className="vpg-chart-zoom-reset" onClick={() => onZoomChange?.(null)}>
            {messages?.resetZoom ?? "Reset zoom"}
          </button>
        ) : null}
      </ThemedChartContainer>
    </>
  );
}
