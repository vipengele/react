/**
 * `<DateRangeField>`'s own styles, injected as an inline `<style>` rather than a `.css` import so
 * the package can stay `"sideEffects": false` (same approach as every other component's stylesheet).
 *
 * Every `--vpg-*` property is *read* here through `var()` and never assigned inline by the
 * component: an inline style declaration always wins over a stylesheet rule for the same property
 * on the same element, so an inline `--vpg-ink` would permanently shadow `@vipengele/react-tokens`'s
 * dark-mode reassignment and this field would stop adapting to colour mode.
 *
 * The group is the `FieldShell`'s marked control, so it carries nothing the shell owns: no border,
 * no background, no radius, no width, no box-shadow, and no rule for the hover, focus, invalid or
 * disabled states. The shell reads all of those off the group. `align-self: stretch` gives the group
 * the shell's height, and each editor stretches to it, so a click anywhere in the field's height
 * lands on an editor. The two editors split the group's width evenly (`flex: 1 1 0`) and shrink
 * below their intrinsic size (`min-width: 0`), so a narrow field squeezes both rather than pushing
 * the end editor out of the box.
 *
 * An editor is an input inside the shell: `outline: none` because the shell draws the focus ring,
 * which reaches into the group, and font and colour declared because a native input inherits
 * neither. `font-variant-numeric: tabular-nums` keeps the digits on a fixed advance, so a segment
 * stepping under an arrow key does not shuffle the segments beside it.
 *
 * The calendar toggle and the clear button stand in the shell's leading and trailing slots,
 * subtrees the shell's `> ` state rules do not reach into — so each draws its own focus-visible
 * ring and its own disabled cursor, and neither carries an `opacity`: the shell already dims for a
 * disabled group.
 *
 * The calendar brings its own padding, so the pop-up panel drops the popover's and its width cap.
 * The two-class selector outranks `.vpg-popover` whichever of the two stylesheets lands later.
 */
export const dateRangeFieldStylesheet = `
.vpg-date-range-field {
  display: flex;
  align-items: center;
  align-self: stretch;
  gap: var(--vpg-space-2);
  min-width: 0;
  color: inherit;
}

.vpg-date-range-field-input {
  box-sizing: border-box;
  flex: 1 1 0;
  align-self: stretch;
  min-width: 0;
  padding: 0;
  border: none;
  outline: none;
  background: none;
  color: inherit;
  font-family: var(--vpg-font-sans);
  font-size: var(--vpg-font-size-sm);
  font-variant-numeric: tabular-nums;
  line-height: 1.5;
}

.vpg-date-range-field-input::placeholder {
  color: var(--vpg-ink-subtle);
}

.vpg-date-range-field-separator {
  flex: none;
  color: var(--vpg-ink-muted);
}

.vpg-date-range-field-calendar-toggle,
.vpg-date-range-field-clear {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: none;
  appearance: none;
  margin: 0;
  padding: var(--vpg-space-1);
  background: none;
  border: none;
  border-radius: var(--vpg-radius-full);
  color: var(--vpg-ink-muted);
  cursor: pointer;
  transition: background-color var(--vpg-duration-fast) var(--vpg-ease-standard),
    color var(--vpg-duration-fast) var(--vpg-ease-standard);
}

.vpg-date-range-field-calendar-toggle-icon,
.vpg-date-range-field-clear-icon {
  flex: none;
  width: var(--vpg-icon-sm);
  height: var(--vpg-icon-sm);
}

.vpg-date-range-field-calendar-toggle:hover:not(:disabled),
.vpg-date-range-field-clear:hover:not(:disabled) {
  background-color: var(--vpg-accent-wash);
  color: var(--vpg-ink);
}

.vpg-date-range-field-calendar-toggle:focus-visible,
.vpg-date-range-field-clear:focus-visible {
  outline: var(--vpg-focus-ring-width) solid var(--vpg-accent-ring);
  outline-offset: var(--vpg-focus-ring-offset);
}

.vpg-date-range-field-calendar-toggle:disabled,
.vpg-date-range-field-clear:disabled {
  cursor: not-allowed;
}

.vpg-popover.vpg-date-range-field-panel {
  max-width: none;
  padding: 0;
}
`;
