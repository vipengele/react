/**
 * `<Dropdown>`'s own styles — the wrapper, the chip row and the `role="combobox"` trigger. The
 * floating listbox, its options and the chips themselves are styled by the shared
 * `internal/listbox.stylesheet.ts`, which every combobox-shaped component in this package injects.
 *
 * Injected as an inline `<style>` rather than a `.css` import so the package can stay
 * `"sideEffects": false` (same approach as `Card`'s and `Popover`'s stylesheets).
 *
 * Every `--tandiko-*` property is *read* here through `var()` and never assigned inline by the
 * component: an inline style declaration always wins over a stylesheet rule for the same property
 * on the same element, so an inline `--tandiko-surface` would permanently shadow the dark-mode
 * reassignment in `@tandiko/tokens`'s base stylesheet and the trigger would stop adapting to
 * colour mode.
 *
 * `@tandiko/tokens` defines no type scale, so those reads carry fallbacks (same convention as
 * `Typography.stylesheet.ts`).
 */
export const dropdownStylesheet = `
.tandiko-dropdown {
  display: inline-block;
  color: var(--tandiko-ink);
  font-family: var(--tandiko-font-sans);
}

/* Holds the chips and the trigger as siblings: the chips' remove buttons must never sit inside
   the trigger, which carries role="combobox" and floating-ui's merged interaction handlers. */
.tandiko-dropdown-control {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.25rem;
}

.tandiko-dropdown-trigger {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  box-sizing: border-box;
  min-width: var(--tandiko-dropdown-min-width, 12rem);
  padding: 0.5rem 0.75rem;
  background-color: var(--tandiko-surface);
  border: 1px solid var(--tandiko-border-strong);
  border-radius: var(--tandiko-radius);
  color: var(--tandiko-ink);
  font-size: var(--tandiko-typography-body-md-size, 1rem);
  line-height: 1.5;
  cursor: pointer;
  user-select: none;
}

.tandiko-dropdown-trigger:hover {
  background-color: var(--tandiko-surface-hover);
}

.tandiko-dropdown-trigger:focus-visible {
  outline: 2px solid var(--tandiko-accent-ring);
  outline-offset: 2px;
}

.tandiko-dropdown-trigger[aria-expanded="true"] {
  border-color: var(--tandiko-accent);
}

.tandiko-dropdown-trigger[aria-invalid="true"] {
  border-color: var(--tandiko-danger, oklch(0.55 0.21 27));
}

.tandiko-dropdown-trigger-icon {
  flex: none;
}

.tandiko-dropdown-value,
.tandiko-dropdown-summary {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tandiko-dropdown-placeholder {
  flex: 1;
  color: var(--tandiko-ink-subtle);
}
`;
