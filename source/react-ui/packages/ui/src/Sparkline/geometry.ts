/** The sparkline's drawing space. The svg stretches it to the box with `preserveAspectRatio="none"`. */
export const SPARKLINE_VIEWBOX_WIDTH = 100;
export const SPARKLINE_VIEWBOX_HEIGHT = 100;
export const SPARKLINE_VIEWBOX = `0 0 ${SPARKLINE_VIEWBOX_WIDTH} ${SPARKLINE_VIEWBOX_HEIGHT}`;

/**
 * The space kept above the highest and below the lowest point, as a fraction of the viewBox
 * height. Being a fraction, it scales with whatever px height the svg is drawn at, so the stroke
 * and the end dot keep the same proportional room at every height.
 */
export const SPARKLINE_PADDING = 0.1;

/** Path coordinates carry this many decimals. */
const PRECISION = 2;

export type SparklineDirection = "rising" | "falling" | "flat";

/** A present value placed in the viewBox. `index` is its position in the input. */
export interface SparklinePoint {
  index: number;
  value: number;
  x: number;
  y: number;
}

/**
 * A maximal run of consecutive present values. A run of one point draws no line: its `line` and
 * `area` are `null` and the point is shown as a dot.
 */
export interface SparklineSegment {
  points: SparklinePoint[];
  /** `M`/`L` commands through the points. */
  line: string | null;
  /** The line closed down to the bottom edge of the viewBox. */
  area: string | null;
}

export interface SparklineTrend {
  direction: SparklineDirection;
  first: number;
  last: number;
  /** Whether the series holds exactly one present value. */
  single: boolean;
}

export interface SparklineGeometry {
  segments: SparklineSegment[];
  /** The last present point, which is not necessarily the last input index. */
  lastPoint: SparklinePoint | null;
  /** `lastPoint` as percentages of the box, for an absolutely positioned dot. */
  dot: { x: number; y: number } | null;
  /** `null` when no value is present. */
  trend: SparklineTrend | null;
}

export interface SparklineOptions {
  /** Vertical padding as a fraction of the viewBox height, in `0..0.5`. */
  padding?: number;
}

export type SparklineValues = ReadonlyArray<number | null | undefined>;

/** A value is present when it is a finite number; `null`, `undefined`, `NaN` and `±Infinity` are absent. */
function isPresent(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function round(value: number): number {
  return Number(value.toFixed(PRECISION));
}

function presentValues(values: SparklineValues): number[] {
  return values.filter(isPresent);
}

function toTrend(values: SparklineValues): SparklineTrend | null {
  const present = presentValues(values);
  if (present.length === 0) return null;
  const first = present[0] as number;
  const last = present[present.length - 1] as number;
  const direction: SparklineDirection = last > first ? "rising" : last < first ? "falling" : "flat";
  return { direction, first, last, single: present.length === 1 };
}

function linePath(points: readonly SparklinePoint[]): string {
  return points.map((point, i) => `${i === 0 ? "M" : "L"}${point.x} ${point.y}`).join(" ");
}

function areaPath(points: readonly SparklinePoint[]): string {
  const first = points[0] as SparklinePoint;
  const last = points[points.length - 1] as SparklinePoint;
  const bottom = SPARKLINE_VIEWBOX_HEIGHT;
  return `M${first.x} ${bottom} L${linePath(points).slice(1)} L${last.x} ${bottom} Z`;
}

function toSegment(points: SparklinePoint[]): SparklineSegment {
  if (points.length === 1) return { points, line: null, area: null };
  return { points, line: linePath(points), area: areaPath(points) };
}

/**
 * Places `values` in the sparkline's viewBox and splits them into drawable segments.
 *
 * Index `i` of `N` values sits at `i / (N - 1)` of the width, so an absent value still holds its
 * slot; a series of one value sits at the horizontal centre. The present values' min..max spans
 * the height inside `padding`, higher values nearer the top; an all-equal series sits at the
 * vertical centre. Coordinates are rounded once, on the point, and both the paths and the dot
 * read that same point, so the dot cannot drift from the end of the line.
 */
export function computeSparkline(values: SparklineValues, options: SparklineOptions = {}): SparklineGeometry {
  const padding = options.padding ?? SPARKLINE_PADDING;
  const present = presentValues(values);
  // `Math.min(...present)` would overflow the call stack on a long series.
  const min = present.reduce((a, b) => Math.min(a, b), Number.POSITIVE_INFINITY);
  const range = present.reduce((a, b) => Math.max(a, b), Number.NEGATIVE_INFINITY) - min;
  const top = padding * SPARKLINE_VIEWBOX_HEIGHT;
  const span = SPARKLINE_VIEWBOX_HEIGHT - 2 * top;

  const xAt = (index: number) =>
    values.length === 1 ? SPARKLINE_VIEWBOX_WIDTH / 2 : (index / (values.length - 1)) * SPARKLINE_VIEWBOX_WIDTH;
  const yAt = (value: number) => (range === 0 ? SPARKLINE_VIEWBOX_HEIGHT / 2 : top + (1 - (value - min) / range) * span);

  const segments: SparklineSegment[] = [];
  let run: SparklinePoint[] = [];
  let lastPoint: SparklinePoint | null = null;
  for (const [index, value] of values.entries()) {
    if (isPresent(value)) {
      lastPoint = { index, value, x: round(xAt(index)), y: round(yAt(value)) };
      run.push(lastPoint);
    } else if (run.length > 0) {
      segments.push(toSegment(run));
      run = [];
    }
  }
  if (run.length > 0) segments.push(toSegment(run));

  const dot = lastPoint ? { x: (lastPoint.x / SPARKLINE_VIEWBOX_WIDTH) * 100, y: (lastPoint.y / SPARKLINE_VIEWBOX_HEIGHT) * 100 } : null;

  return { segments, lastPoint, dot, trend: toTrend(values) };
}

/**
 * A text summary of the series for assistive technology, numbers formatted for `locale`:
 * `Trend: rising, from 12 to 31` from the first to the last present value, `Trend: flat, at 12`
 * when only one value is present, and `No data` when none is.
 */
export function describeTrend(values: SparklineValues, locale?: string): string {
  const trend = toTrend(values);
  if (!trend) return "No data";
  const format = new Intl.NumberFormat(locale);
  if (trend.single) return `Trend: flat, at ${format.format(trend.first)}`;
  return `Trend: ${trend.direction}, from ${format.format(trend.first)} to ${format.format(trend.last)}`;
}
