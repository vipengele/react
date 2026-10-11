import type { ReactNode } from "react";
import type { TooltipContentProps } from "recharts";
import { seriesColor } from "../seriesColor.js";
import type { ChartSeries, ChartTooltipLabelFormatter, ChartTooltipValueFormatter } from "../types.js";

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
}

/**
 * Renders the tooltip's content for a Recharts `Tooltip`: the active sample's x value as the
 * heading, then each series by label, swatch and value, in the series' own order. A series with
 * no numeric value at the active sample is left out, and a sample where every series has none
 * shows no tooltip at all.
 */
export function seriesTooltip({ series, formatLabel, formatValue }: SeriesTooltipOptions) {
  return ({ active, payload, label }: TooltipContentProps): ReactNode => {
    if (!active) return null;
    const values = new Map(payload.map((item) => [String(item.dataKey), item.value]));
    const items = series.flatMap((entry, index) => {
      const value = values.get(entry.key);
      return typeof value === "number" ? [{ entry, index, value }] : [];
    });
    if (items.length === 0) return null;
    return (
      <div className="vpg-chart-tooltip">
        <p className="vpg-chart-tooltip-label">{formatLabel(Number(label))}</p>
        <ul className="vpg-chart-tooltip-items">
          {items.map(({ entry, index, value }) => (
            <li key={entry.key} className="vpg-chart-tooltip-item">
              <Swatch color={seriesColor(entry, index)} />
              <span>{entry.label}</span>
              <span className="vpg-chart-tooltip-value">{formatValue(value, entry)}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  };
}
