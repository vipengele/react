import type { Ref } from "react";

/**
 * The prop and value types every cartesian chart in the package takes. Each chart re-exports them
 * under its own public names, so this module is part of the public type surface: every type here
 * is written out, and none names or derives from a type of the charting library beneath.
 */

/**
 * One sample: the x value under `xKey` and each series' value under its own `key`. A `null` or
 * missing series value is a gap in that series.
 */
export type ChartRow = Readonly<Record<string, number | null | undefined>>;

/** One of the theme's six series colour roles, `--vpg-chart-1` to `--vpg-chart-6`. */
export type ChartColorIndex = 1 | 2 | 3 | 4 | 5 | 6;

/** A series drawn from `data`. */
export interface ChartSeries {
  /** The row field this series reads its values from. */
  readonly key: string;
  /** The name the legend and the tooltip show for this series. */
  readonly label: string;
  /** Pins the series to one colour role; by default series `i` takes role `(i % 6) + 1`. */
  readonly colorIndex?: ChartColorIndex;
}

/**
 * How the x axis reads its values: `"number"` for plain numbers, `"time"` for epoch
 * milliseconds.
 */
export type ChartXKind = "number" | "time";

/** Formats an x value for an axis tick. */
export type ChartXFormatter = (x: number) => string;

/** Formats a y value for an axis tick. */
export type ChartYFormatter = (y: number) => string;

/** Formats the x value heading the tooltip. */
export type ChartTooltipLabelFormatter = (x: number) => string;

/** Formats one series' value in the tooltip. */
export type ChartTooltipValueFormatter = (value: number, series: ChartSeries) => string;

/** What the chart shows: the chart itself when `"ready"`, otherwise a message in its place. */
export type ChartStatus = "ready" | "loading" | "empty" | "error";

/** Replaces the chart's default English text: the message shown for a status, and the reset control's label. */
export interface ChartMessages {
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
export interface ChartZoom {
  readonly start: number;
  readonly end: number;
}

/** The props of a cartesian chart, whatever marks it draws its series with. */
export interface CartesianChartProps {
  data: readonly ChartRow[];
  /** The row field holding each sample's x value. */
  xKey: string;
  series: readonly ChartSeries[];
  /** Defaults to `"number"`. */
  xKind?: ChartXKind;
  /** A pixel count, or a percentage of a parent of definite height. */
  height?: number | `${number}%`;
  /** Derives the height from the width: `width / aspect`. */
  aspect?: number;
  /** Defaults to the number as written, or for `"time"` a time of day (a date when the data spans more than a day). */
  formatX?: ChartXFormatter;
  /** Defaults to the number as written. */
  formatY?: ChartYFormatter;
  /** Defaults to `formatX`, or for `"time"` the full local date and time. */
  formatTooltipLabel?: ChartTooltipLabelFormatter;
  /** Defaults to `formatY`. */
  formatTooltipValue?: ChartTooltipValueFormatter;
  /**
   * Any status but `"ready"` shows its message at the chart's size and mounts no chart. Defaults
   * to `"ready"`.
   */
  status?: ChartStatus;
  /** Overrides the default text: the message per status, and the reset control's label. */
  messages?: ChartMessages;
  /**
   * The x range the chart shows, or `null`/absent for all of `data`. Samples outside it are not
   * drawn. The chart never changes it itself: it reports a new one through `onZoomChange`.
   */
  zoom?: ChartZoom | null;
  /**
   * Called once when a drag across the plot is released, with the range it covers, and with
   * `null` when the reset control is pressed. A press without a drag, `Escape` or the pointer
   * leaving the plot ends the drag without calling it.
   */
  onZoomChange?: (zoom: ChartZoom | null) => void;
  className?: string;
  /** Reaches the chart's outermost element. */
  ref?: Ref<HTMLDivElement>;
}
