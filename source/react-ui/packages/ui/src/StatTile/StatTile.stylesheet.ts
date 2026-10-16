/**
 * `<StatTile>`'s own styles, injected as an inline `<style>` rather than a `.css` import so the
 * package can stay `"sideEffects": false`.
 *
 * Every `--vpg-*` property is *read* here through `var()` and never assigned inline by the
 * component: an inline declaration always wins over a stylesheet rule for the same property on the
 * same element, so an inline status colour would shadow the colour-mode reassignment in
 * `@vipengele/react-tokens`'s base stylesheet and the tile would stop adapting to colour mode.
 *
 * The tile takes no fixed height: it grows with a wrapping label, value or supporting line, and a
 * row of tiles lines up through its container's own alignment.
 *
 * The value is set in the monospace family with tabular figures, so digits keep one advance width
 * and a value that changes does not shift the text around it. It never transitions or animates.
 * The placeholder sits in the same element as a present value, so it shares the value's font
 * metrics and a tile keeps its height whether its value is present or missing.
 *
 * Each status tone draws its glyph on a disc filled with the status colour in its `-contrast` ink.
 * A status colour never stands alone as a glyph colour on the surface: `--vpg-warning` falls under
 * the contrast a glyph needs against a light surface (ADR-0033).
 *
 * `.vpg-stat-tile-visual` wraps the trailing slot and only places it; whatever node the caller
 * passes keeps its own styles.
 *
 * `.vpg-stat-tile-visually-hidden` keeps the tone label in the tile's text for assistive technology
 * without taking up visual space.
 */
export const statTileStylesheet = `
.vpg-stat-tile {
  display: flex;
  align-items: center;
  gap: var(--vpg-space-4);
  box-sizing: border-box;
  min-width: 0;
  padding: var(--vpg-space-4);
  background-color: var(--vpg-surface-raised);
  border: 1px solid var(--vpg-border);
  border-radius: var(--vpg-radius);
  color: var(--vpg-ink);
}

.vpg-stat-tile-body {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: var(--vpg-space-1);
  min-width: 0;
}

.vpg-stat-tile-header {
  display: flex;
  align-items: center;
  gap: var(--vpg-space-2);
  min-width: 0;
}

.vpg-stat-tile-label {
  min-width: 0;
  color: var(--vpg-ink-muted);
  font-size: var(--vpg-font-size-sm);
  font-weight: var(--vpg-font-weight-medium);
  line-height: 1.4;
  overflow-wrap: anywhere;
}

.vpg-stat-tile-icon {
  box-sizing: content-box;
  flex: none;
  width: var(--vpg-icon-sm);
  height: var(--vpg-icon-sm);
  padding: var(--vpg-space-1);
  border-radius: var(--vpg-radius-full);
}

.vpg-stat-tile-success .vpg-stat-tile-icon {
  background-color: var(--vpg-success);
  color: var(--vpg-success-contrast);
}

.vpg-stat-tile-warning .vpg-stat-tile-icon {
  background-color: var(--vpg-warning);
  color: var(--vpg-warning-contrast);
}

.vpg-stat-tile-info .vpg-stat-tile-icon {
  background-color: var(--vpg-info);
  color: var(--vpg-info-contrast);
}

.vpg-stat-tile-danger .vpg-stat-tile-icon {
  background-color: var(--vpg-danger);
  color: var(--vpg-danger-contrast);
}

.vpg-stat-tile-value {
  min-width: 0;
  font-family: var(--vpg-font-mono);
  font-size: var(--vpg-font-size-2xl);
  font-weight: var(--vpg-font-weight-semibold);
  font-variant-numeric: tabular-nums;
  line-height: 1.2;
  overflow-wrap: anywhere;
  transition: none;
  animation: none;
}

.vpg-stat-tile-placeholder {
  color: var(--vpg-ink-muted);
}

.vpg-stat-tile-supporting {
  min-width: 0;
  color: var(--vpg-ink-muted);
  font-size: var(--vpg-font-size-sm);
  line-height: 1.4;
  overflow-wrap: anywhere;
}

.vpg-stat-tile-visual {
  display: flex;
  flex: none;
  align-items: center;
}

.vpg-stat-tile-visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
`;
