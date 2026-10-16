/**
 * `<TimeRangeField>`'s own styles, injected as an inline `<style>` rather than a `.css` import so
 * the package can stay `"sideEffects": false` (same approach as every other component's stylesheet).
 * The segments and the literals between them are `TimeField`'s and take `TimeField`'s stylesheet,
 * which the field injects beside this one; this one lays out the group and the two editors.
 *
 * Every `--vpg-*` property is *read* here through `var()` and never assigned inline by the
 * component: an inline style declaration always wins over a stylesheet rule for the same property
 * on the same element, so an inline `--vpg-ink` would permanently shadow `@vipengele/react-tokens`'s
 * dark-mode reassignment and this field would stop adapting to colour mode.
 *
 * The outer group is the `FieldShell`'s marked control, so it carries nothing the shell owns: no
 * border, no background, no radius, no width, no box-shadow, and no rule for the hover, focus,
 * invalid or disabled states. The shell reads all of those off the outer group, whose `aria-invalid`
 * and `aria-disabled` cover both editors. `align-self: stretch` gives the group the shell's height,
 * and each editor stretches to it. `font-variant-numeric: tabular-nums` keeps every digit on one
 * advance, so a segment does not change width as its value steps.
 */
export const timeRangeFieldStylesheet = `
.vpg-time-range-field {
  display: inline-flex;
  align-items: center;
  align-self: stretch;
  gap: var(--vpg-space-2);
  min-width: 0;
  color: inherit;
  font-family: var(--vpg-font-sans);
  font-size: var(--vpg-font-size-sm);
  font-variant-numeric: tabular-nums;
  line-height: 1.5;
  white-space: nowrap;
}

.vpg-time-range-field-editor {
  display: inline-flex;
  align-items: center;
  align-self: stretch;
  min-width: 0;
}

.vpg-time-range-field-separator {
  flex: none;
  color: var(--vpg-ink-muted);
}
`;
