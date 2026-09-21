/**
 * `<Textarea>`'s own styles, injected as an inline `<style>` rather than a `.css` import so the
 * package can stay `"sideEffects": false` (same approach as every other component's stylesheet).
 *
 * Every `--vpg-*` property is *read* here through `var()` and never assigned inline by the
 * component: an inline style declaration always wins over a stylesheet rule for the same
 * property on the same element, so an inline `--vpg-ink` would permanently shadow
 * `@vipengele/react-tokens`'s dark-mode reassignment and this field would stop adapting to colour mode.
 *
 * This is the styling of a control sitting inside a `FieldShell`, so it carries nothing the shell
 * owns: no border, no background, no radius, no width, no box-shadow, and no rule for the hover,
 * focus, invalid or disabled states. Redeclaring one of those means the treatment is applied
 * twice — a ring drawn on the textarea inside the ring drawn on the shell, an opacity multiplied
 * into itself. `outline: none` is here for the same reason: the shell draws the focus ring, and
 * the textarea's native outline would sit inside it.
 *
 * The horizontal padding is the shell's, so the textarea resets its UA padding there and keeps
 * only a vertical one of its own: a multi-line control that sat flush against the shell's top and
 * bottom edges would put its first and last lines on the border. `align-self: stretch` is how it
 * takes the shell's height rather than restating it — the shell centres its children, and a
 * centred control is only as tall as its own text, so the top and bottom few pixels of a short
 * field focus nothing when clicked. A `height` here cannot do that: the shell's height is a
 * floor, not a fixed length, so a percentage resolves against an indefinite containing block.
 *
 * `box-sizing: content-box` is what makes a height in `lh` mean a whole number of rows. On
 * `border-box` the vertical padding is subtracted from the box instead of added to it, so a
 * `max-height` of `Nlh` clips the last row by twice the padding, and a `min-height` of `Nlh`
 * shows one row less than it names.
 *
 * Typography stays the control's own concern. A native textarea inherits neither font nor colour
 * from its ancestors, so both are declared here or the field renders in the UA's form defaults.
 */
export const textareaStylesheet = `
.vpg-textarea {
  box-sizing: content-box;
  align-self: stretch;
  min-width: 0;
  padding-block: var(--vpg-space-1);
  padding-inline: 0;
  border: none;
  outline: none;
  background: none;
  color: inherit;
  font-family: var(--vpg-font-sans);
  font-size: var(--vpg-font-size-sm);
  line-height: 1.5;
  resize: vertical;
}

/* Under \`field-sizing: content\` the box tracks the text, so a drag handle would fight the next
   keystroke for the height — the content wins it back. The component's inline \`min-height\` and
   \`max-height\` are the bounds that growth runs between; \`rows\` is inert here, which is why the
   floor is stated as a length at all. */
.vpg-textarea[data-auto-grow] {
  resize: none;
  field-sizing: content;
}

.vpg-textarea::placeholder {
  color: var(--vpg-ink-subtle);
}
`;
