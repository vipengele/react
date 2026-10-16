/**
 * `<DateTimeRangeField>`'s own styles, injected as an inline `<style>` rather than a `.css` import
 * so the package can stay `"sideEffects": false` (same approach as every other component's
 * stylesheet).
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
 * lands on an editor.
 *
 * The field is as wide as its content. The component gives each editor an inline width of one `ch`
 * per character of the longer of its text and its placeholder, so an editor holds its width while
 * the user types into it and never clips a date-time. The shell, which fills its container for every
 * other field, shrink-wraps this one (`width: fit-content`), so the two values sit beside each
 * other with only the separator between them and no empty stretch follows the end. The two-class
 * selector outranks `.vpg-field-shell` whichever of the two stylesheets lands later.
 *
 * A length the caller sets as the group's width — through `className` or `style`, which land on
 * it — is part of that content, so the shell grows to hold it and the editors share the room beyond
 * their own widths (`flex: 1 1 auto`). A percentage resolves against the shrink-wrapped shell and
 * widens nothing. A container's width caps the field rather than widening it: the shell never grows
 * past its container (`max-width: 100%`), and in a container narrower than the content both editors
 * shrink below their text (`min-width: 0`) rather than pushing the end editor out of the box.
 *
 * An editor is an input inside the shell: `outline: none` because the shell draws the focus ring,
 * which reaches into the group, and font and colour declared because a native input inherits
 * neither. `font-variant-numeric: tabular-nums` keeps the digits on one advance.
 *
 * The calendar toggle and the clear button stand in the shell's leading and trailing slots,
 * subtrees the shell's `> ` state rules do not reach into — so each draws its own focus-visible
 * ring and its own disabled cursor, and neither carries an `opacity`: the shell already dims for a
 * disabled group.
 *
 * The pop-up stacks the calendar, the start time, the end time and the Done button. The calendar
 * and the time panels bring their own padding, so the popover drops its own and its width cap; the
 * two-class selector outranks `.vpg-popover` whichever of the two stylesheets lands later. The
 * calendar sets the pop-up's width: `contain: inline-size` gives each time section no intrinsic
 * width of its own, so its strips stretch to the calendar's width and scroll sideways rather than
 * widening the pop-up to every option in a row. Each time panel sits under its own visible label,
 * which takes the panel's top padding. The picker takes focus only from a press on its own
 * background, never from the keyboard, so it draws no outline.
 */
export const dateTimeRangeFieldStylesheet = `
.vpg-field-shell.vpg-date-time-range-field-shell {
  width: fit-content;
  max-width: 100%;
}

.vpg-date-time-range-field {
  display: flex;
  align-items: center;
  align-self: stretch;
  gap: var(--vpg-space-2);
  min-width: 0;
  color: inherit;
}

.vpg-date-time-range-field-input {
  box-sizing: border-box;
  flex: 1 1 auto;
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

.vpg-date-time-range-field-input::placeholder {
  color: var(--vpg-ink-subtle);
}

.vpg-date-time-range-field-separator {
  flex: none;
  color: var(--vpg-ink-muted);
}

.vpg-date-time-range-field-calendar-toggle,
.vpg-date-time-range-field-clear {
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

.vpg-date-time-range-field-calendar-toggle-icon,
.vpg-date-time-range-field-clear-icon {
  flex: none;
  width: var(--vpg-icon-sm);
  height: var(--vpg-icon-sm);
}

.vpg-date-time-range-field-calendar-toggle:hover:not(:disabled),
.vpg-date-time-range-field-clear:hover:not(:disabled) {
  background-color: var(--vpg-accent-wash);
  color: var(--vpg-ink);
}

.vpg-date-time-range-field-calendar-toggle:focus-visible,
.vpg-date-time-range-field-clear:focus-visible {
  outline: var(--vpg-focus-ring-width) solid var(--vpg-accent-ring);
  outline-offset: var(--vpg-focus-ring-offset);
}

.vpg-date-time-range-field-calendar-toggle:disabled,
.vpg-date-time-range-field-clear:disabled {
  cursor: not-allowed;
}

.vpg-popover.vpg-date-time-range-field-panel {
  max-width: none;
  padding: 0;
}

.vpg-date-time-range-field-picker {
  display: flex;
  flex-direction: column;
  outline: none;
}

.vpg-date-time-range-field-time {
  contain: inline-size;
  border-top: 1px solid var(--vpg-border);
}

.vpg-date-time-range-field-time-label {
  display: block;
  padding: var(--vpg-space-3) var(--vpg-space-3) 0;
  color: var(--vpg-ink-muted);
  font-family: var(--vpg-font-sans);
  font-size: var(--vpg-font-size-sm);
  font-weight: var(--vpg-font-weight-semibold);
}

.vpg-date-time-range-field-time > .vpg-time-panel {
  padding-top: var(--vpg-space-2);
}

.vpg-date-time-range-field-actions {
  display: flex;
  justify-content: flex-end;
  padding: 0 var(--vpg-space-3) var(--vpg-space-3);
}
`;
