/**
 * `<DateTimeField>`'s own styles, injected as an inline `<style>` rather than a `.css` import so the
 * package can stay `"sideEffects": false` (same approach as every other component's stylesheet).
 *
 * Every `--vpg-*` property is *read* here through `var()` and never assigned inline by the
 * component: an inline style declaration always wins over a stylesheet rule for the same property
 * on the same element, so an inline theme property would shadow `@vipengele/react-tokens`'s
 * reassignments and this field would stop adapting to them.
 *
 * The group is a wrapping flex row of the two halves' `FieldShell`s. Each shell keeps all of its
 * own chrome; this sheet only says how the two share the row. A flex basis of the column-width
 * step stands in for the shell's own `width: 100%` as each one's main size, so the two sit side by
 * side while the row holds both at that width, share what is left over equally, and wrap onto two
 * lines once it does not. `min-width: 0` lets a half narrower than its content shrink inside a row
 * narrower than the basis rather than overflow it.
 */
export const dateTimeFieldStylesheet = `
.vpg-date-time-field {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: var(--vpg-space-2);
  min-width: 0;
}

.vpg-date-time-field > .vpg-field-shell {
  flex: 1 1 var(--vpg-column-sm);
  min-width: 0;
}
`;
