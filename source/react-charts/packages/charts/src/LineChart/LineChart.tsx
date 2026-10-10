import { Line, LineChart as RechartsLineChart } from "recharts";
import { CartesianChartFrame } from "../internal/CartesianChartFrame/CartesianChartFrame.js";
import { seriesColor } from "../internal/seriesColor.js";
import type { CartesianChartProps } from "../internal/types.js";
import { lineChartStylesheet } from "./LineChart.stylesheet.js";

export type {
  ChartColorIndex as LineChartColorIndex,
  ChartMessages as LineChartMessages,
  ChartRow as LineChartRow,
  ChartSeries as LineChartSeries,
  ChartStatus as LineChartStatus,
  ChartTooltipLabelFormatter as LineChartTooltipLabelFormatter,
  ChartTooltipValueFormatter as LineChartTooltipValueFormatter,
  ChartXFormatter as LineChartXFormatter,
  ChartXKind as LineChartXKind,
  ChartYFormatter as LineChartYFormatter,
  ChartZoom as LineChartZoom,
} from "../internal/types.js";

export interface LineChartProps extends CartesianChartProps {
  /** Draws each line straight across missing samples rather than leaving a gap. Defaults to `false`. */
  connectGaps?: boolean;
}

const STYLESHEET = { href: "vpg-chart-line", css: lineChartStylesheet } as const;

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
export function LineChart({ connectGaps = false, ...props }: LineChartProps) {
  return (
    <CartesianChartFrame {...props} root={RechartsLineChart} chartClassName="vpg-chart-line" stylesheet={STYLESHEET}>
      {props.series.map((entry, index) => (
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
    </CartesianChartFrame>
  );
}
