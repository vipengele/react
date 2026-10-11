/**
 * `<Calendar>`'s own styles, injected as an inline `<style>` rather than a `.css` import so the
 * package can stay `"sideEffects": false` (same approach as every other component's stylesheet).
 *
 * Every `--vpg-*` property is *read* here through `var()` and never assigned inline by the
 * component: an inline style declaration always wins over a stylesheet rule for the same property
 * on the same element, so an inline `--vpg-accent` would permanently shadow the dark-mode
 * reassignment in `@vipengele/react-tokens`'s base stylesheet and the calendar would stop adapting
 * to colour mode.
 *
 * Every cell, a day or a blank, is a fixed square at the size scale's default control step, and the
 * grid always renders six weeks, so the calendar keeps one height whichever month it shows and a
 * `Popover` holding it never jumps. The footer's Clear button stays rendered while nothing is
 * selected for the same reason.
 *
 * Day state is read off the ARIA the component already sets: the selected day is filled with the
 * accent, today is in the accent's ink, and a disabled day is in the subtle ink, and a selected disabled day is the accent wash in that ink. The month buttons
 * and the Clear button are dimmed off `aria-disabled` rather than `:disabled`, because they are
 * never natively disabled.
 */
export const calendarStylesheet = `
.vpg-calendar {
  display: inline-flex;
  flex-direction: column;
  gap: var(--vpg-space-2);
  box-sizing: border-box;
  padding: var(--vpg-space-3);
  color: var(--vpg-ink);
  font-family: var(--vpg-font-sans);
  font-size: var(--vpg-font-size-sm);
  /* Digits keep one width, so the day numbers line up in their columns. */
  font-variant-numeric: tabular-nums;
}

.vpg-calendar-header {
  display: flex;
  align-items: center;
  gap: var(--vpg-space-2);
}

.vpg-calendar-heading {
  flex: 1;
  text-align: center;
  font-weight: var(--vpg-font-weight-semibold);
  white-space: nowrap;
}

.vpg-calendar-nav,
.vpg-calendar-clear {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  margin: 0;
  border: 1px solid transparent;
  border-radius: var(--vpg-radius);
  background-color: transparent;
  font: inherit;
  line-height: 1;
  cursor: pointer;
  transition: background-color var(--vpg-duration-fast) var(--vpg-ease-standard),
    color var(--vpg-duration-fast) var(--vpg-ease-standard);
}

.vpg-calendar-nav {
  min-width: var(--vpg-size-md);
  min-height: var(--vpg-size-md);
  padding: 0;
  color: var(--vpg-ink);
}

.vpg-calendar-nav:hover:not([aria-disabled="true"]),
.vpg-calendar-clear:hover:not([aria-disabled="true"]) {
  background-color: var(--vpg-surface-hover);
}

.vpg-calendar-nav:active:not([aria-disabled="true"]),
.vpg-calendar-clear:active:not([aria-disabled="true"]) {
  background-color: var(--vpg-surface-press);
}

.vpg-calendar-nav:focus-visible,
.vpg-calendar-clear:focus-visible,
.vpg-calendar-day:focus-visible {
  outline: var(--vpg-focus-ring-width) solid var(--vpg-accent-ring);
  outline-offset: var(--vpg-focus-ring-offset);
}

.vpg-calendar-nav[aria-disabled="true"] {
  cursor: not-allowed;
  color: var(--vpg-ink-subtle);
}

.vpg-calendar-nav-icon {
  flex: none;
  width: var(--vpg-icon-sm);
  height: var(--vpg-icon-sm);
}

.vpg-calendar-grid {
  border-collapse: collapse;
  border-spacing: 0;
  table-layout: fixed;
}

.vpg-calendar-weekday {
  box-sizing: border-box;
  width: var(--vpg-size-md);
  height: var(--vpg-size-sm);
  padding: 0;
  color: var(--vpg-ink-muted);
  font-size: var(--vpg-font-size-xs);
  font-weight: var(--vpg-font-weight-medium);
  text-align: center;
}

/* A blank keeps a day's size, so a week of blanks keeps the grid's height. */
.vpg-calendar-day,
.vpg-calendar-blank {
  box-sizing: border-box;
  width: var(--vpg-size-md);
  height: var(--vpg-size-md);
  padding: 0;
  text-align: center;
  vertical-align: middle;
}

.vpg-calendar-day {
  border-radius: var(--vpg-radius);
  cursor: pointer;
  transition: background-color var(--vpg-duration-fast) var(--vpg-ease-standard),
    color var(--vpg-duration-fast) var(--vpg-ease-standard);
}

.vpg-calendar-day:hover:not([aria-disabled="true"]) {
  background-color: var(--vpg-surface-hover);
}

.vpg-calendar-day[aria-current="date"] {
  color: var(--vpg-accent);
  font-weight: var(--vpg-font-weight-semibold);
}

.vpg-calendar-day[aria-disabled="true"] {
  cursor: not-allowed;
  color: var(--vpg-ink-subtle);
}

.vpg-calendar-day[aria-selected="true"] {
  background-color: var(--vpg-accent);
  color: var(--vpg-accent-contrast);
  font-weight: var(--vpg-font-weight-semibold);
}

.vpg-calendar-day[aria-selected="true"]:hover:not([aria-disabled="true"]) {
  background-color: var(--vpg-accent-hover);
}

/* A selected day that cannot be selected (outside min/max, or reported by isDateDisabled) keeps
   the selection's weight but in the wash and the subtle ink, so it never reads as a valid pick.
   The extra attribute outranks the selected and today rules whatever their order. */
.vpg-calendar-day[aria-selected="true"][aria-disabled="true"] {
  background-color: var(--vpg-accent-wash);
  color: var(--vpg-ink-subtle);
  cursor: not-allowed;
}

.vpg-calendar-footer {
  display: flex;
  justify-content: flex-end;
}

.vpg-calendar-clear {
  min-height: var(--vpg-size-sm);
  padding: 0 var(--vpg-space-2);
  color: var(--vpg-accent);
}

.vpg-calendar-clear[aria-disabled="true"] {
  cursor: not-allowed;
  color: var(--vpg-ink-subtle);
}
`;
