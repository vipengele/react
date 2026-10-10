/**
 * `<LineChart>`'s own styles, injected as an inline `<style>` rather than a `.css` import so the
 * package can stay `"sideEffects": false`. The chart renders inside `<ThemedChartContainer>`, whose
 * own stylesheet makes `--vpg-ink` the `color` everything here inherits through `currentColor`.
 *
 * Every colour is a `var()` read of a `@vipengele/react-tokens` role with no literal fallback
 * (ADR-0009), and none is assigned inline, so the chart follows the tokens' colour mode. The
 * series colours themselves are `--vpg-chart-N` reads on the marks and swatches (ADR-0030).
 */
export const lineChartStylesheet = `
.vpg-chart-line {
  font-size: var(--vpg-font-size-xs);
}

.vpg-chart-message {
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  padding: var(--vpg-space-4);
  color: var(--vpg-ink-muted);
  font-size: var(--vpg-font-size-sm);
  outline: 1px solid var(--vpg-border);
  outline-offset: -1px;
}

.vpg-chart-message-text {
  margin: 0;
  text-align: center;
}

.vpg-chart-legend {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--vpg-space-2) var(--vpg-space-4);
  margin: 0;
  padding: var(--vpg-space-2) 0 0;
  list-style: none;
}

.vpg-chart-legend-item,
.vpg-chart-tooltip-item {
  display: flex;
  align-items: center;
  gap: var(--vpg-space-2);
}

.vpg-chart-swatch {
  flex: none;
  width: 0.75rem;
  height: 0.75rem;
}

.vpg-chart-tooltip {
  padding: var(--vpg-space-2) var(--vpg-space-3);
  border: 1px solid var(--vpg-border);
  border-radius: var(--vpg-radius);
  background-color: var(--vpg-surface-raised);
  color: var(--vpg-ink);
  white-space: nowrap;
}

.vpg-chart-tooltip-label {
  margin: 0 0 var(--vpg-space-1);
  font-weight: 500;
}

.vpg-chart-tooltip-items {
  display: grid;
  gap: var(--vpg-space-1);
  margin: 0;
  padding: 0;
  list-style: none;
}

.vpg-chart-tooltip-value {
  margin-inline-start: auto;
  padding-inline-start: var(--vpg-space-3);
  font-variant-numeric: tabular-nums;
}
`;
