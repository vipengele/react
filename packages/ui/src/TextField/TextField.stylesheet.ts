/**
 * `<TextField>`'s own styles, injected as an inline `<style>` rather than a `.css` import so the
 * package can stay `"sideEffects": false` (same approach as every other component's stylesheet).
 *
 * Every `--tandiko-*` property is *read* here through `var()` and never assigned inline by the
 * component: an inline style declaration always wins over a stylesheet rule for the same
 * property on the same element, so an inline `--tandiko-ink` would permanently shadow
 * `@tandiko/tokens`'s dark-mode reassignment and this field would stop adapting to colour mode.
 *
 * This is the styling of an input sitting inside a `FieldShell`, so it carries nothing the shell
 * owns: no border, no background, no radius, no width, no box-shadow, and no rule for the hover,
 * focus, invalid or disabled states. Redeclaring one of those means the treatment is applied
 * twice — a ring drawn on the input inside the ring drawn on the shell, an opacity multiplied
 * into itself. `outline: none` is here for the same reason: the shell draws the focus ring, and
 * the input's native outline would sit inside it.
 *
 * Typography stays the input's own concern. A native input inherits neither font nor colour from
 * its ancestors, so both are declared here or the field renders in the UA's form defaults.
 */
export const textFieldStylesheet = `
.tandiko-text-field {
  box-sizing: border-box;
  height: 100%;
  min-width: 0;
  padding: 0;
  border: none;
  outline: none;
  background: none;
  color: inherit;
  font-family: var(--tandiko-font-sans);
  font-size: var(--tandiko-font-size-sm);
  line-height: 1.5;
}

.tandiko-text-field::placeholder {
  color: var(--tandiko-ink-subtle);
}
`;
