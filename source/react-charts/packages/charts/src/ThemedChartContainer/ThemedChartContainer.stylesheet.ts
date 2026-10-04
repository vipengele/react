/**
 * `<ThemedChartContainer>`'s own styles, injected as an inline `<style>` rather than a `.css`
 * import so the package can stay `"sideEffects": false`.
 *
 * Both colours are `var()` reads of `@vipengele/react-tokens` roles with no literal fallback
 * (ADR-0009), and neither is ever assigned inline: an inline declaration beats the tokens' own
 * colour-mode reassignment, so the container would stop following light and dark mode.
 *
 * `color` is the contract a child chart themes against: anything a chart paints with
 * `currentColor` takes `--vpg-ink`.
 *
 * The frame is an outline drawn inward, not a border. Recharts sizes the chart from the
 * container's border box on mount and from its content box on every resize after, so a border
 * would lay the first frame out 2px larger than the space it then settles into; an outline takes
 * no space, and both measurements agree.
 */
export const themedChartContainerStylesheet = `
.vpg-chart-container {
  color: var(--vpg-ink);
  outline: 1px solid var(--vpg-border);
  outline-offset: -1px;
}
`;
