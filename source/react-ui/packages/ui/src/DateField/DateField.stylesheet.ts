/**
 * `<DateField>`'s own styles, injected as an inline `<style>` rather than a `.css` import so the
 * package can stay `"sideEffects": false` (same approach as every other component's stylesheet).
 *
 * Every `--vpg-*` property is *read* here through `var()` and never assigned inline by the
 * component: an inline style declaration always wins over a stylesheet rule for the same property
 * on the same element, so an inline `--vpg-ink` would permanently shadow `@vipengele/react-tokens`'s
 * dark-mode reassignment and this field would stop adapting to colour mode.
 *
 * This is the styling of an input sitting inside a `FieldShell`, so it carries nothing the shell
 * owns: no border, no background, no radius, no width, no box-shadow, and no rule for the hover,
 * focus, invalid or disabled states. `outline: none` is here because the shell draws the focus
 * ring, and the input's native outline would sit inside it. `align-self: stretch` makes the input
 * take the shell's height, so a click anywhere in the field's height lands on it.
 *
 * A native input inherits neither font nor colour from its ancestors, so both are declared here.
 * `font-variant-numeric: tabular-nums` keeps the digits on a fixed advance, so a segment whose
 * digits change under an arrow key does not shuffle the segments beside it sideways.
 *
 * The calendar toggle and the clear button stand in the shell's leading and trailing slots,
 * subtrees the shell's `> ` state rules do not reach into — so each draws its own focus-visible
 * ring and its own disabled cursor. Neither carries an `opacity`: the shell already dims for a
 * disabled control, and a second fade here would read as more faded than the field around it.
 * The toggle sits inside the popover's inline-flex trigger wrapper, which sizes to the button and
 * adds no baseline gap, so the leading slot centres it as it centres the clear button.
 *
 * The calendar brings its own padding, so the pop-up panel drops the popover's and its width cap:
 * a calendar is wider than the cap leaves room for once both paddings are counted. The two-class
 * selector outranks `.vpg-popover` whichever of the two stylesheets lands later.
 */
export const dateFieldStylesheet = `
.vpg-date-field {
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

.vpg-date-field::placeholder {
  color: var(--vpg-ink-subtle);
}

.vpg-date-field-calendar-toggle,
.vpg-date-field-clear {
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

.vpg-date-field-calendar-toggle-icon,
.vpg-date-field-clear-icon {
  flex: none;
  width: var(--vpg-icon-sm);
  height: var(--vpg-icon-sm);
}

.vpg-date-field-calendar-toggle:hover:not(:disabled),
.vpg-date-field-clear:hover:not(:disabled) {
  background-color: var(--vpg-accent-wash);
  color: var(--vpg-ink);
}

.vpg-date-field-calendar-toggle:focus-visible,
.vpg-date-field-clear:focus-visible {
  outline: var(--vpg-focus-ring-width) solid var(--vpg-accent-ring);
  outline-offset: var(--vpg-focus-ring-offset);
}

.vpg-date-field-calendar-toggle:disabled,
.vpg-date-field-clear:disabled {
  cursor: not-allowed;
}

.vpg-popover.vpg-date-field-panel {
  max-width: none;
  padding: 0;
}
`;
