/**
 * `<NumberInput>`'s own styles, injected as an inline `<style>` rather than a `.css` import so the
 * package can stay `"sideEffects": false` (same approach as every other component's stylesheet).
 *
 * Every `--vpg-*` property is *read* here through `var()` and never assigned inline by the
 * component: an inline style declaration always wins over a stylesheet rule for the same property
 * on the same element, so an inline `--vpg-ink` would permanently shadow `@vipengele/react-tokens`'s
 * dark-mode reassignment and this field would stop adapting to colour mode.
 *
 * This is the styling of an input sitting inside a `FieldShell`, so it carries nothing the shell
 * owns: no border, no background, no radius, no width, no box-shadow, and no rule for the hover,
 * focus, invalid or disabled states. Redeclaring one of those means the treatment is applied
 * twice — a ring drawn on the input inside the ring drawn on the shell, an opacity multiplied
 * into itself. `outline: none` is here for the same reason: the shell draws the focus ring, and
 * the input's native outline would sit inside it.
 *
 * Height is the shell's too, and `align-self: stretch` is how the control takes it rather than
 * restating it: the shell centres its children, and a centred input is only as tall as its own
 * text, so the top and bottom few pixels of the field focus nothing when clicked.
 *
 * Typography stays the input's own concern. A native input inherits neither font nor colour from
 * its ancestors, so both are declared here or the field renders in the UA's form defaults.
 * `font-variant-numeric: tabular-nums` keeps the digits on a fixed advance, so a number whose
 * digits change under an arrow key does not shuffle the ones beside it sideways.
 *
 * The stepper buttons sit inside the shell's trailing slot rather than being direct children of
 * the shell, whose state selectors read `> :focus-visible` and `> :disabled` off its direct
 * children only — the slot span, not the buttons in it. So each button draws its own
 * focus-visible ring and its own disabled cursor. It draws no `opacity`: the buttons are disabled
 * exactly when the input is, and the shell already fades the whole field off the input's
 * `:disabled`, so a second fade here would read as more faded than the field around it.
 */
export const numberInputStylesheet = `
.vpg-number-input {
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

.vpg-number-input::placeholder {
  color: var(--vpg-ink-subtle);
}

/* The pair stacks, increment above decrement, so the two read as one control and each press lands
   on the direction it points at. A column here and not on the slot itself: the slot is a row that
   a caller's own adornment shares. */
.vpg-number-input-steppers {
  display: flex;
  flex-direction: column;
}

.vpg-number-input-stepper {
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  border: none;
  border-radius: var(--vpg-radius-sm);
  padding: 0;
  margin: 0;
  background: none;
  color: var(--vpg-ink-muted);
  cursor: pointer;
  transition: color var(--vpg-duration-fast) var(--vpg-ease-standard);
}

.vpg-number-input-stepper:hover:not(:disabled) {
  color: var(--vpg-ink);
}

.vpg-number-input-stepper:focus-visible {
  outline: var(--vpg-focus-ring-width) solid var(--vpg-accent-ring);
  outline-offset: var(--vpg-focus-ring-offset);
}

.vpg-number-input-stepper:disabled {
  cursor: not-allowed;
}

/* Sized off the icon scale rather than lucide's own 24px default, which two of, stacked, is
   taller than the field they sit in. */
.vpg-number-input-stepper-icon {
  width: var(--vpg-icon-sm);
  height: var(--vpg-icon-sm);
}
`;
