/**
 * `<PasswordInput>`'s own styles, injected as an inline `<style>` rather than a `.css` import so
 * the package can stay `"sideEffects": false` (same approach as every other component's
 * stylesheet). This styles only the reveal button; the field's chrome and the input's own
 * typography come from `FieldShell` and `TextField`, both already injected by the `TextField`
 * this component composes.
 *
 * Every `--vpg-*` property is *read* here through `var()` and never assigned inline by the
 * component: an inline style declaration always wins over a stylesheet rule for the same
 * property on the same element, so an inline `--vpg-accent-ring` would permanently shadow
 * the dark-mode reassignment in `@vipengele/react-tokens`'s base stylesheet and the button would stop
 * adapting to colour mode.
 *
 * The button sits in `FieldShell`'s trailing slot, a direct child of the shell whose own state
 * selectors read `> :focus-visible` and `> :disabled` off the shell's direct children only — the
 * slot span, not the button inside it. So the button needs its own focus-visible ring; neither
 * that ring nor the pointer cursor is inherited from the shell. Dimming is: `PasswordInput`
 * disables the button exactly when it disables the input, so the shell's own `opacity` on
 * `.vpg-field-shell` already fades the button along with the rest of the field, and this
 * rule carries no `opacity` of its own — one would compound onto the shell's and read as more
 * faded than the field around it.
 */
export const passwordInputStylesheet = `
.vpg-password-input-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  border: none;
  border-radius: var(--vpg-radius-sm);
  padding: 0 var(--vpg-space-1);
  margin: 0;
  background: none;
  color: var(--vpg-ink-muted);
  font-family: inherit;
  font-size: var(--vpg-font-size-xs);
  line-height: 1;
  cursor: pointer;
  transition: color var(--vpg-duration-fast) var(--vpg-ease-standard);
}

.vpg-password-input-toggle:hover:not(:disabled) {
  color: var(--vpg-ink);
}

.vpg-password-input-toggle:focus-visible {
  outline: var(--vpg-focus-ring-width) solid var(--vpg-accent-ring);
  outline-offset: var(--vpg-focus-ring-offset);
}

.vpg-password-input-toggle:disabled {
  cursor: not-allowed;
}
`;
