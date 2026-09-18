/**
 * `<PasswordInput>`'s own styles, injected as an inline `<style>` rather than a `.css` import so
 * the package can stay `"sideEffects": false` (same approach as every other component's
 * stylesheet). This styles only the reveal button; the field's chrome and the input's own
 * typography come from `FieldShell` and `TextField`, both already injected by the `TextField`
 * this component composes.
 *
 * Every `--tandiko-*` property is *read* here through `var()` and never assigned inline by the
 * component: an inline style declaration always wins over a stylesheet rule for the same
 * property on the same element, so an inline `--tandiko-accent-ring` would permanently shadow
 * the dark-mode reassignment in `@tandiko/tokens`'s base stylesheet and the button would stop
 * adapting to colour mode.
 *
 * The button sits in `FieldShell`'s trailing slot, a direct child of the shell whose own state
 * selectors read `> :focus-visible` and `> :disabled` off the shell's direct children only — the
 * slot span, not the button inside it. So the button needs its own focus-visible ring and its
 * own disabled treatment; neither is inherited from the shell.
 */
export const passwordInputStylesheet = `
.tandiko-password-input-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  border: none;
  border-radius: var(--tandiko-radius-sm);
  padding: 0 var(--tandiko-space-1);
  margin: 0;
  background: none;
  color: var(--tandiko-ink-muted);
  font-family: inherit;
  font-size: var(--tandiko-font-size-xs);
  line-height: 1;
  cursor: pointer;
  transition: color var(--tandiko-duration-fast) var(--tandiko-ease-standard);
}

.tandiko-password-input-toggle:hover:not(:disabled) {
  color: var(--tandiko-ink);
}

.tandiko-password-input-toggle:focus-visible {
  outline: var(--tandiko-focus-ring-width) solid var(--tandiko-accent-ring);
  outline-offset: var(--tandiko-focus-ring-offset);
}

.tandiko-password-input-toggle:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}
`;
