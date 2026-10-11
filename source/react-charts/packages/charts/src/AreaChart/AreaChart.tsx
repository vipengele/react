import { Area, AreaChart as RechartsAreaChart, ReferenceLine, useYAxisDomain } from "recharts";
import { CartesianChartFrame } from "../internal/CartesianChartFrame/CartesianChartFrame.js";
import { seriesColor } from "../internal/seriesColor.js";
import type { CartesianChartProps } from "../internal/types.js";

export type {
  ChartColorIndex as AreaChartColorIndex,
  ChartMessages as AreaChartMessages,
  ChartRow as AreaChartRow,
  ChartSeries as AreaChartSeries,
  ChartStatus as AreaChartStatus,
  ChartTooltipLabelFormatter as AreaChartTooltipLabelFormatter,
  ChartTooltipValueFormatter as AreaChartTooltipValueFormatter,
  ChartXFormatter as AreaChartXFormatter,
  ChartXKind as AreaChartXKind,
  ChartYFormatter as AreaChartYFormatter,
  ChartZoom as AreaChartZoom,
} from "../internal/types.js";

export interface AreaChartProps extends CartesianChartProps {
  /** Draws each area straight across missing samples rather than leaving a gap. Defaults to `false`. */
  connectGaps?: boolean;
  /**
   * Draws a line at zero while the y axis shows both negative and positive values. Defaults to
   * `true`.
   */
  zeroLine?: boolean;
}

/** The opacity of an area's fill over its series colour; the outline is drawn opaque. */
const FILL_ALPHA = 0.2;

/**
 * The line at y = 0, drawn only while the y domain has zero strictly inside it. With zero at
 * either end the line would lie on the plot's edge, over the x axis or along the top, and mark
 * nothing. The domain is the one the axis shows, so it follows the zoom.
 */
function ZeroLine() {
  const [min, max] = useYAxisDomain() ?? [];
  if (!(Number(min) < 0 && Number(max) > 0)) return null;
  return <ReferenceLine y={0} className="vpg-chart-zero-line" stroke="var(--vpg-border-strong)" strokeWidth={1} />;
}

/**
 * A multi-series area chart, themed from `@vipengele/react-tokens`. It fills its parent's width,
 * and takes its height from `height`, else from `aspect`, else from the parent.
 *
 * Each series fills the space between its values and zero, so a negative value fills downward;
 * the areas overlap rather than stack. A mirrored pair, such as download and upload with upload
 * given as negative values, sits either side of the zero line, which is drawn while the y axis
 * spans zero unless `zeroLine` is `false`.
 *
 * Series `i` is drawn in `--vpg-chart-${(i % 6) + 1}` unless its `colorIndex` pins a role: the
 * outline in the colour itself, the fill in a translucent version of it. The legend and tooltip
 * name every series by its `label`, so a series is never told apart by colour alone (ADR-0030).
 * Axes, grid and text take the theme's ink and border roles, so the chart follows the theme and
 * its colour mode inside a `ThemeProvider`. Nothing animates.
 *
 * Zoom is controlled: dragging across the plot reports a range through `onZoomChange`, and the
 * chart shows the range its `zoom` prop names, with a reset control while one is set. Several
 * charts given the same `zoom` and `onZoomChange` zoom together.
 *
 * The chart's classes are `vpg-chart-*`; the DOM beneath them is not part of the contract.
 */
export function AreaChart({ connectGaps = false, zeroLine = true, ...props }: AreaChartProps) {
  return (
    <CartesianChartFrame {...props} root={RechartsAreaChart} chartClassName="vpg-chart-area">
      {props.series.map((entry, index) => {
        const color = seriesColor(entry, index);
        return (
          <Area
            key={entry.key}
            type="monotone"
            dataKey={entry.key}
            name={entry.label}
            stroke={color}
            strokeWidth={1.75}
            fill={`oklch(from ${color} l c h / ${FILL_ALPHA})`}
            fillOpacity={1}
            dot={false}
            connectNulls={connectGaps}
            isAnimationActive={false}
          />
        );
      })}
      {zeroLine ? <ZeroLine /> : null}
    </CartesianChartFrame>
  );
}
