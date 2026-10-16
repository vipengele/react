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
 *
 * The field is as wide as its content. Each segment sizes to its text, and the shell, which fills
 * its container for every other field, shrink-wraps this one (`width: fit-content`), so no empty
 * stretch follows the end editor. The two-class selector outranks `.vpg-field-shell` whichever of
 * the two stylesheets lands later. A length the caller sets as the group's width — through
 * `className` or `style`, which land on it — is part of that content, so the shell grows to hold
 * it. A container's width caps the field rather than widening it: the shell never grows past its
 * container (`max-width: 100%`), and in a container narrower than the content the editors shrink
 * (`min-width: 0`) rather than pushing the end editor out of the box.
 */
export const timeRangeFieldStylesheet = `
.vpg-field-shell.vpg-time-range-field-shell {
  width: fit-content;
  max-width: 100%;
}

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
