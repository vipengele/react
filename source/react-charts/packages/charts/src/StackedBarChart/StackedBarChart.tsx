import { Bar, BarChart } from "recharts";
import { CartesianChartFrame } from "../internal/CartesianChartFrame/CartesianChartFrame.js";
import { seriesColor } from "../internal/seriesColor.js";
import type { CartesianChartProps, ChartStatusMessages } from "../internal/types.js";

export type {
  ChartColorIndex as StackedBarChartColorIndex,
  ChartColorRole as StackedBarChartColorRole,
  ChartRow as StackedBarChartRow,
  ChartSeries as StackedBarChartSeries,
  ChartStatus as StackedBarChartStatus,
  ChartStatusMessages as StackedBarChartMessages,
  ChartTooltipLabelFormatter as StackedBarChartTooltipLabelFormatter,
  ChartTooltipValueFormatter as StackedBarChartTooltipValueFormatter,
  ChartXFormatter as StackedBarChartXFormatter,
  ChartXKind as StackedBarChartXKind,
  ChartYFormatter as StackedBarChartYFormatter,
} from "../internal/types.js";

export interface StackedBarChartProps extends Omit<CartesianChartProps, "zoom" | "onZoomChange" | "messages"> {
  /** Overrides the default message per status. */
  messages?: ChartStatusMessages;
}

/** The stack every series' bars belong to, so each x value draws one bar of all its series. */
const STACK_ID = "stack";

/**
 * The widest a bar is drawn, in pixels; bars narrow below it as categories crowd the plot. A lone
 * category has no neighbour to measure a slot from, so the charting library takes this as its
 * slot's width and draws the bar a little narrower. Without it a lone category's bar is 0px wide,
 * which is to say not drawn at all.
 */
const MAX_BAR_SIZE = 48;

/**
 * A stacked bar chart of counts over x, such as outcomes per run or per day, themed from
 * `@vipengele/react-tokens`. It fills its parent's width, and takes its height from `height`, else
 * from `aspect`, else from the parent.
 *
 * Each distinct x value is a category with a bar of its own, centred on a tick labelled through
 * `formatX`; the bars stack each series' value onto the series before it, in the series' order. A
 * `null` or missing value adds no segment, and a category with no value in any series draws no bar.
 *
 * Series `i` is drawn in `--vpg-chart-${(i % 6) + 1}` unless its `color` or `colorIndex` names a
 * role, and the legend and tooltip name every series by its `label`, so a series is never told
 * apart by colour alone (ADR-0040). Axes, grid and text take the theme's ink and border roles, so
 * the chart follows the theme and its colour mode inside a `ThemeProvider`. Nothing animates, and
 * the chart does not zoom.
 *
 * The chart's classes are `vpg-chart-*`; the DOM beneath them is not part of the contract.
 */
export function StackedBarChart(props: StackedBarChartProps) {
  return (
    <CartesianChartFrame {...props} axis="band" root={BarChart} chartClassName="vpg-chart-stacked-bar">
      {props.series.map((entry, index) => (
        <Bar
          key={entry.key}
          stackId={STACK_ID}
          dataKey={entry.key}
          name={entry.label}
          fill={seriesColor(entry, index)}
          maxBarSize={MAX_BAR_SIZE}
          isAnimationActive={false}
        />
      ))}
    </CartesianChartFrame>
  );
}
