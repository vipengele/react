/**
 * `<TimePanel>`'s own styles, injected as an inline `<style>` rather than a `.css` import so the
 * package can stay `"sideEffects": false` (same approach as every other component's stylesheet).
 *
 * Every `--vpg-*` property is *read* here through `var()` and never assigned inline by the
 * component: an inline style declaration always wins over a stylesheet rule for the same property
 * on the same element, so an inline `--vpg-accent` would permanently shadow the dark-mode
 * reassignment in `@vipengele/react-tokens`'s base stylesheet and the panel would stop adapting to
 * colour mode.
 *
 * Each strip is one row that scrolls sideways rather than wrapping, so the panel keeps one height
 * whatever the minute step. Every option is a fixed-width chip at the size scale's default control
 * step, and `tabular-nums` keeps the digits on one advance, so the columns of the strips line up.
 *
 * Option state is read off the ARIA the component already sets: the selected option is filled
 * with the accent, a disabled one is in the subtle ink, and a selected disabled one is the accent
 * wash in that ink. Options are never natively disabled, so they are dimmed off `aria-disabled`.
 */
export const timePanelStylesheet = `
.vpg-time-panel {
  display: flex;
  flex-direction: column;
  gap: var(--vpg-space-2);
  box-sizing: border-box;
  min-width: 0;
  padding: var(--vpg-space-3);
  color: var(--vpg-ink);
  font-family: var(--vpg-font-sans);
  font-size: var(--vpg-font-size-sm);
  font-variant-numeric: tabular-nums;
}

.vpg-time-panel-strip {
  display: flex;
  gap: var(--vpg-space-1);
  min-width: 0;
  overflow-x: auto;
  /* Room for the focus ring, which the scroll container would otherwise clip. */
  padding: var(--vpg-focus-ring-width);
  scrollbar-width: thin;
}

.vpg-time-panel-option {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  min-width: var(--vpg-size-md);
  height: var(--vpg-size-md);
  padding: 0 var(--vpg-space-2);
  border-radius: var(--vpg-radius);
  white-space: nowrap;
  cursor: pointer;
  user-select: none;
  transition: background-color var(--vpg-duration-fast) var(--vpg-ease-standard),
    color var(--vpg-duration-fast) var(--vpg-ease-standard);
}

.vpg-time-panel-option:hover:not([aria-disabled="true"]) {
  background-color: var(--vpg-surface-hover);
}

.vpg-time-panel-option:active:not([aria-disabled="true"]) {
  background-color: var(--vpg-surface-press);
}

.vpg-time-panel-option:focus-visible {
  outline: var(--vpg-focus-ring-width) solid var(--vpg-accent-ring);
  outline-offset: calc(var(--vpg-focus-ring-offset) * -1);
}

.vpg-time-panel-option[aria-disabled="true"] {
  cursor: not-allowed;
  color: var(--vpg-ink-subtle);
}

.vpg-time-panel-option[aria-checked="true"] {
  background-color: var(--vpg-accent);
  color: var(--vpg-accent-contrast);
  font-weight: var(--vpg-font-weight-semibold);
}

.vpg-time-panel-option[aria-checked="true"]:hover:not([aria-disabled="true"]) {
  background-color: var(--vpg-accent-hover);
}

/* A selected option no allowed time uses keeps the selection's weight but in the wash and the
   subtle ink, so it never reads as a valid pick. The extra attribute outranks the selected rule
   whatever their order. */
.vpg-time-panel-option[aria-checked="true"][aria-disabled="true"] {
  background-color: var(--vpg-accent-wash);
  color: var(--vpg-ink-subtle);
}
`;
