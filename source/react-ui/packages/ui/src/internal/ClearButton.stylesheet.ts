/**
 * The shared clear button's styles — the round, icon-only button a field puts in its trailing slot
 * to empty itself. It lives here, injected under its own `<style href>` by `ClearButton`, rather
 * than being duplicated per component or imported from one component's directory into another's.
 *
 * Injected as an inline `<style>` rather than a `.css` import so the package can stay
 * `"sideEffects": false` (same approach as every other component's stylesheet).
 *
 * Every `--vpg-*` property is *read* here through `var()` and never assigned inline by the
 * component: an inline style declaration always wins over a stylesheet rule for the same property
 * on the same element, so an inline `--vpg-accent-ring` would permanently shadow the dark-mode
 * reassignment in `@vipengele/react-tokens`'s base stylesheet and the button would stop adapting
 * to colour mode.
 *
 * The button stands in `FieldShell`'s trailing slot, a subtree the shell's `> ` state rules do not
 * reach into — so its focus ring and its disabled cursor are its own, and the field takes no focus
 * ring from it. It carries no `opacity` either: the shell already dims for a disabled control, and
 * a second fade here reads as more faded than the field around it.
 */
export const clearButtonStylesheet = `
.vpg-clear-button {
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

.vpg-clear-button-icon {
  flex: none;
  width: var(--vpg-icon-sm);
  height: var(--vpg-icon-sm);
}

.vpg-clear-button:hover:not(:disabled) {
  background-color: var(--vpg-accent-wash);
  color: var(--vpg-ink);
}

.vpg-clear-button:focus-visible {
  outline: var(--vpg-focus-ring-width) solid var(--vpg-accent-ring);
  outline-offset: var(--vpg-focus-ring-offset);
}

.vpg-clear-button:disabled {
  cursor: not-allowed;
}
`;
