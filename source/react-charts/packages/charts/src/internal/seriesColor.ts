import type { ChartColorIndex, ChartColorRole, ChartSeries } from "./types.js";

/**
 * The theme property each colour role reads. `neutral` reads `--vpg-ink`: the theme has no neutral
 * role of its own, and its other neutral greys (`--vpg-ink-muted`, `--vpg-border-strong`) are
 * translucent, so a bar or area drawn in one would let the gridlines show through it.
 */
const ROLE_PROPERTIES: Readonly<Record<ChartColorRole, `--vpg-${string}`>> = {
  "chart-1": "--vpg-chart-1",
  "chart-2": "--vpg-chart-2",
  "chart-3": "--vpg-chart-3",
  "chart-4": "--vpg-chart-4",
  "chart-5": "--vpg-chart-5",
  "chart-6": "--vpg-chart-6",
  success: "--vpg-success",
  danger: "--vpg-danger",
  warning: "--vpg-warning",
  info: "--vpg-info",
  neutral: "--vpg-ink",
};

/**
 * The colour series `index` is drawn in: its `color` role, else the series role its `colorIndex`
 * pins, else role `(index % 6) + 1`. The property is read bare, so it follows the theme.
 */
export function seriesColor(series: ChartSeries, index: number): string {
  const role: ChartColorRole = series.color ?? `chart-${series.colorIndex ?? (((index % 6) + 1) as ChartColorIndex)}`;
  return `var(${ROLE_PROPERTIES[role]})`;
}
