/**
 * `<DateTimeField>`'s own styles, injected as an inline `<style>` rather than a `.css` import so the
 * package can stay `"sideEffects": false` (same approach as every other component's stylesheet).
 *
 * Every `--vpg-*` property is *read* here through `var()` and never assigned inline by the
 * component: an inline style declaration always wins over a stylesheet rule for the same property
 * on the same element, so an inline `--vpg-ink` would permanently shadow `@vipengele/react-tokens`'s
 * dark-mode reassignment and this field would stop adapting to colour mode.
 *
 * The input sits inside a `FieldShell`, so it carries nothing the shell owns: no border, no
 * background, no radius, no width, no box-shadow, and no rule for the hover, focus, invalid or
 * disabled states. `outline: none` is here because the shell draws the focus ring, and the input's
 * native outline would sit inside it. `align-self: stretch` makes the input take the shell's
 * height. A native input inherits neither font nor colour, so both are declared, with
 * `tabular-nums` keeping the digits on one advance.
 *
 * The calendar toggle and the clear button stand in the shell's leading and trailing slots,
 * subtrees the shell's `> ` state rules do not reach into — so each draws its own focus-visible
 * ring and its own disabled cursor, and neither carries an `opacity` the dimmed shell would
 * compound.
 *
 * The pop-up stacks the calendar, the time panel and the Done button. The calendar and the time
 * panel bring their own padding, so the popover drops its own and its width cap; the two-class
 * selector outranks `.vpg-popover` whichever of the two stylesheets lands later. The calendar sets
 * the pop-up's width: `contain: inline-size` gives the time panel no intrinsic width of its own,
 * so its strips stretch to the calendar's width and scroll sideways rather than widening the
 * pop-up to every option in a row. The picker takes focus only from a press on its own background,
 * never from the keyboard, so it draws no outline.
 */
export const dateTimeFieldStylesheet = `
.vpg-date-time-field {
  box-sizing: border-box;
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

.vpg-date-time-field::placeholder {
  color: var(--vpg-ink-subtle);
}

.vpg-date-time-field-calendar-toggle,
.vpg-date-time-field-clear {
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

.vpg-date-time-field-calendar-toggle-icon,
.vpg-date-time-field-clear-icon {
  flex: none;
  width: var(--vpg-icon-sm);
  height: var(--vpg-icon-sm);
}

.vpg-date-time-field-calendar-toggle:hover:not(:disabled),
.vpg-date-time-field-clear:hover:not(:disabled) {
  background-color: var(--vpg-accent-wash);
  color: var(--vpg-ink);
}

.vpg-date-time-field-calendar-toggle:focus-visible,
.vpg-date-time-field-clear:focus-visible {
  outline: var(--vpg-focus-ring-width) solid var(--vpg-accent-ring);
  outline-offset: var(--vpg-focus-ring-offset);
}

.vpg-date-time-field-calendar-toggle:disabled,
.vpg-date-time-field-clear:disabled {
  cursor: not-allowed;
}

.vpg-popover.vpg-date-time-field-panel {
  max-width: none;
  padding: 0;
}

.vpg-date-time-field-picker {
  display: flex;
  flex-direction: column;
  outline: none;
}

.vpg-date-time-field-picker > .vpg-time-panel {
  contain: inline-size;
  border-top: 1px solid var(--vpg-border);
}

.vpg-date-time-field-actions {
  display: flex;
  justify-content: flex-end;
  padding: 0 var(--vpg-space-3) var(--vpg-space-3);
}
`;
