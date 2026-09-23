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
`;
