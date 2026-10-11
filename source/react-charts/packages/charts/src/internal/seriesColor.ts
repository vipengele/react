import type { ChartSeries } from "./types.js";

/**
 * The colour series `index` is drawn in: the role its `colorIndex` pins, else role
 * `(index % 6) + 1`, read bare from `--vpg-chart-N` so it follows the theme.
 */
export function seriesColor(series: ChartSeries, index: number): string {
  return `var(--vpg-chart-${series.colorIndex ?? (index % 6) + 1})`;
}
