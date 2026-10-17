import type { ReactNode } from "react";
import type { TooltipContentProps } from "recharts";
import { seriesColor } from "../seriesColor.js";
import type { CartesianChartProps, ChartRow, ChartSeries, ChartTooltipLabelFormatter, ChartTooltipValueFormatter } from "../types.js";

/** A short line in the series' colour, standing for it in the legend and the tooltip. */
function Swatch({ color }: { color: string }) {
  return (
    <svg className="vpg-chart-swatch" viewBox="0 0 12 12" aria-hidden="true">
      <line x1={0} y1={6} x2={12} y2={6} stroke={color} strokeWidth={2} />
    </svg>
  );
}

/** Names every series by its label beside its swatch, in the series' own order. */
export function SeriesLegend({ series }: { series: readonly ChartSeries[] }) {
  return (
    <ul className="vpg-chart-legend">
      {series.map((entry, index) => (
        <li key={entry.key} className="vpg-chart-legend-item">
          <Swatch color={seriesColor(entry, index)} />
          <span>{entry.label}</span>
        </li>
      ))}
    </ul>
  );
}

export interface SeriesTooltipOptions {
  series: readonly ChartSeries[];
  formatLabel: ChartTooltipLabelFormatter;
  formatValue: ChartTooltipValueFormatter;
  /** The rows the chart shows, which `renderDetail` is given the active sample's row from. */
  rows: readonly ChartRow[];
  xKey: string;
  renderDetail?: CartesianChartProps["renderTooltipDetail"];
}

/** Whether React draws anything for `node`: `null`, `undefined`, a boolean and `""` draw nothing. */
function hasContent(node: ReactNode): boolean {
  return node != null && typeof node !== "boolean" && node !== "";
}

/**
 * Renders the tooltip's content for a Recharts `Tooltip`: the active sample's x value as the
 * heading, then each series by label, swatch and value, in the series' own order, then whatever
 * `renderDetail` returns for the sample. A series with no numeric value at the active sample is
 * left out, and with every series left out the list is not drawn. A sample with neither a series
 * value nor detail content shows no tooltip at all.
 *
 * The detail's row is found in `rows` by the active x value rather than read from the tooltip's
 * payload, which carries nothing for a series whose value is missing.
 */
export function seriesTooltip({ series, formatLabel, formatValue, rows, xKey, renderDetail }: SeriesTooltipOptions) {
  return ({ active, payload, label }: TooltipContentProps): ReactNode => {
    if (!active) return null;
    const x = Number(label);
    const values = new Map(payload.map((item) => [String(item.dataKey), item.value]));
    const items = series.flatMap((entry, index) => {
      const value = values.get(entry.key);
      return typeof value === "number" ? [{ entry, index, value }] : [];
    });
    const detail = renderDetail?.({ x, row: rows.find((row) => row[xKey] === x) });
    const showDetail = hasContent(detail);
    if (items.length === 0 && !showDetail) return null;
    return (
      <div className="vpg-chart-tooltip">
        <p className="vpg-chart-tooltip-label">{formatLabel(x)}</p>
        {items.length > 0 ? (
          <ul className="vpg-chart-tooltip-items">
            {items.map(({ entry, index, value }) => (
              <li key={entry.key} className="vpg-chart-tooltip-item">
                <Swatch color={seriesColor(entry, index)} />
                <span>{entry.label}</span>
                <span className="vpg-chart-tooltip-value">{formatValue(value, entry)}</span>
              </li>
            ))}
          </ul>
        ) : null}
        {showDetail ? <div className="vpg-chart-tooltip-detail">{detail}</div> : null}
      </div>
    );
  };
}
