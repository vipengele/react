import type { ReactElement, ReactNode } from "react";
import { CartesianGrid, Legend, Tooltip, XAxis, YAxis } from "recharts";
import { ChartMessage } from "../ChartMessage/ChartMessage.js";
import { chartFormatters } from "../formatters.js";
import { SeriesLegend, seriesTooltip } from "../SeriesKey/SeriesKey.js";
import { ThemedChartContainer } from "../ThemedChartContainer/ThemedChartContainer.js";
import type { CartesianChartProps, ChartRow } from "../types.js";
import { rowsInZoom } from "../zoom/rowsInZoom.js";
import { ZoomLayer } from "../zoom/ZoomLayer.js";

/** The Recharts root chart component a frame draws into, such as Recharts' `LineChart`. */
export type CartesianChartRoot = (props: {
  data: ChartRow[];
  margin: { top: number; right: number; bottom: number; left: number };
  children: ReactNode;
}) => ReactElement;

export interface CartesianChartFrameProps extends CartesianChartProps {
  /** The Recharts root chart the series marks belong to. */
  root: CartesianChartRoot;
  /** The chart type's own class on the container, alongside `vpg-chart-container` and `className`. */
  chartClassName: string;
  /** The chart type's stylesheet, injected under `href` as both its key and its precedence. */
  stylesheet: { readonly href: string; readonly css: string };
  /** The series marks, drawn above the grid, axes, tooltip and legend and beneath the zoom layer. */
  children: ReactNode;
}

/**
 * Everything a cartesian chart draws around its series marks: the themed container, the grid, the
 * x and y axes with their formatters, the tooltip and legend naming every series by its label, the
 * drag-to-zoom layer and its reset control, and the message that replaces the chart for any status
 * but `"ready"`. The chart type supplies only its Recharts root and the marks, as `children`.
 *
 * With a `zoom`, only the rows within it reach the root, the x domain is pinned to it, and a time
 * axis picks its default tick format from the zoomed span. The zoom layer is given the unzoomed
 * `data`, so a drag in progress is discarded when `data` changes and never because `zoom` does.
 */
export function CartesianChartFrame({
  root: Root,
  chartClassName,
  stylesheet,
  children,
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
  status = "ready",
  messages,
  zoom,
  onZoomChange,
  className,
  ref,
}: CartesianChartFrameProps) {
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
        React 19 hoists and de-duplicates this by `href`, so N charts on a page inject one
        stylesheet.
      */}
      <style href={stylesheet.href} precedence={stylesheet.href}>
        {stylesheet.css}
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
        <Root data={rows as ChartRow[]} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
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
          {children}
          <ZoomLayer data={data} onZoomChange={onZoomChange} />
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
