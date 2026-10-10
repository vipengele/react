import type { ChartRow, ChartTooltipLabelFormatter, ChartTooltipValueFormatter, ChartXFormatter, ChartYFormatter } from "./types.js";

const DAY_MS = 86_400_000;

/** Spans the x values in `data`, or `0` for data with fewer than two of them. */
function xSpan(data: readonly ChartRow[], xKey: string): number {
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

function defaultTimeTick(span: number): ChartXFormatter {
  if (span > DAY_MS) return (x) => new Date(x).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return (x) => new Date(x).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: false });
}

const formatNumber = (value: number) => String(value);

export interface ChartFormatterOptions {
  /** Whether the x axis reads epoch milliseconds, an `xKind` of `"time"`. */
  isTime: boolean;
  /** The rows the chart draws; a time axis picks its default tick format from their span. */
  rows: readonly ChartRow[];
  xKey: string;
  formatX: ChartXFormatter | undefined;
  formatY: ChartYFormatter | undefined;
  formatTooltipLabel: ChartTooltipLabelFormatter | undefined;
  formatTooltipValue: ChartTooltipValueFormatter | undefined;
}

export interface ChartFormatters {
  readonly tickX: ChartXFormatter;
  readonly tickY: ChartYFormatter;
  readonly tooltipLabel: ChartTooltipLabelFormatter;
  readonly tooltipValue: ChartTooltipValueFormatter;
}

/**
 * Resolves the axis and tooltip formatters from the caller's, filling in the defaults: numbers as
 * written; for a time axis x ticks a time of day, or a date when `rows` span more than a day, and a
 * tooltip heading of the full local date and time unless `formatX` is given. The tooltip heading
 * falls back to the x tick format and the tooltip value to the y tick format.
 */
export function chartFormatters({
  isTime,
  rows,
  xKey,
  formatX,
  formatY,
  formatTooltipLabel,
  formatTooltipValue,
}: ChartFormatterOptions): ChartFormatters {
  const tickX = formatX ?? (isTime ? defaultTimeTick(xSpan(rows, xKey)) : formatNumber);
  const tickY = formatY ?? formatNumber;
  const tooltipLabel = formatTooltipLabel ?? (isTime && !formatX ? (x: number) => new Date(x).toLocaleString() : tickX);
  const tooltipValue: ChartTooltipValueFormatter = formatTooltipValue ?? ((value) => tickY(value));
  return { tickX, tickY, tooltipLabel, tooltipValue };
}
