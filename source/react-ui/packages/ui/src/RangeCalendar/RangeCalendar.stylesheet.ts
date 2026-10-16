/**
 * `<RangeCalendar>`'s own styles, layered over `Calendar`'s, which its grid core injects. Injected as
 * an inline `<style>` rather than a `.css` import so the package can stay `"sideEffects": false`
 * (same approach as every other component's stylesheet).
 *
 * Every `--vpg-*` property is *read* here through `var()` and never assigned inline by the
 * component, so colour-mode reassignment in `@vipengele/react-tokens` keeps reaching the calendar.
 *
 * Day state is read off the attributes the component sets on each day: `aria-selected` on an
 * endpoint or the pending anchor (filled with the accent by `Calendar`'s rules), `data-range-start`
 * and `data-range-end` on the ends of the drawn span, `data-in-range` on the days strictly between
 * them, and `data-preview` on every day of a span that runs from the anchor to the hovered or
 * focused day. The days between the ends sit on the accent wash with square corners, and each end
 * squares its corners on the side that faces the span, so the span reads as one band. A previewed
 * end that is not yet picked is the wash with an accent edge, never the accent fill of a pick.
 *
 * Every rule here is scoped under `.vpg-range-calendar` and carries at least one more attribute or
 * class than the `Calendar` rule it overrides, so it wins whichever order the two stylesheets
 * land in. Ink is left to `Calendar`'s rules, so today and a disabled day keep their colour inside
 * the span.
 */
export const rangeCalendarStylesheet = `
.vpg-range-calendar {
  /* A pointer travelling from the first pick to the second never selects the day numbers. */
  -webkit-user-select: none;
  user-select: none;
}

.vpg-range-calendar .vpg-calendar-day[data-in-range]:not([aria-selected="true"]) {
  border-radius: 0;
  background-color: var(--vpg-accent-wash);
}

.vpg-range-calendar .vpg-calendar-day[data-range-start]:not([data-range-end]) {
  border-start-end-radius: 0;
  border-end-end-radius: 0;
}

.vpg-range-calendar .vpg-calendar-day[data-range-end]:not([data-range-start]) {
  border-start-start-radius: 0;
  border-end-start-radius: 0;
}

.vpg-range-calendar .vpg-calendar-day[data-preview][data-range-start]:not([aria-selected="true"]),
.vpg-range-calendar .vpg-calendar-day[data-preview][data-range-end]:not([aria-selected="true"]) {
  background-color: var(--vpg-accent-wash);
  box-shadow: inset 0 0 0 1px var(--vpg-accent);
}
`;
