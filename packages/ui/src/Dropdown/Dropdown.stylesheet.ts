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
   the trigger, which carries role="combobox" and floating-ui's merged interaction handlers.
   This element carries the field's visual boundary — border, radius, background — in both
   single- and multiple-select mode, so a multi-select with several chips reads as one field
   rather than as loose chips next to an unrelated small box. The trigger inside it is
   deliberately unbordered: its own hover/focus states highlight just itself within the field,
   while :has() reaches out from it to react the field's border to the trigger's expanded/
   invalid state, since floating-ui's combobox role lives on the trigger, not this wrapper. */
.tandiko-dropdown-control {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.375rem;
  box-sizing: border-box;
  min-width: var(--tandiko-dropdown-min-width, 12rem);
  padding: 0.375rem 0.5rem;
  background-color: var(--tandiko-surface);
  border: 1px solid var(--tandiko-border-strong);
  border-radius: var(--tandiko-radius);
  transition: border-color 120ms ease, box-shadow 120ms ease;
}

.tandiko-dropdown-control:has(.tandiko-dropdown-trigger[aria-expanded="true"]) {
  border-color: var(--tandiko-accent);
}

.tandiko-dropdown-control:has(.tandiko-dropdown-trigger:focus-visible) {
  border-color: var(--tandiko-accent);
  box-shadow: 0 0 0 3px var(--tandiko-accent-ring);
}

.tandiko-dropdown-control:has(.tandiko-dropdown-trigger[aria-invalid="true"]) {
  border-color: var(--tandiko-danger, oklch(0.55 0.21 27));
}

.tandiko-dropdown-trigger {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
  min-width: 0;
  padding: 0.125rem 0.25rem;
  border-radius: var(--tandiko-radius-sm);
  color: var(--tandiko-ink);
  font-size: var(--tandiko-typography-body-md-size, 1rem);
  line-height: 1.5;
  cursor: pointer;
  user-select: none;
}

.tandiko-dropdown-trigger:hover {
  background-color: var(--tandiko-surface-hover);
}

/* The ring is drawn on .tandiko-dropdown-control instead (via :has() above), so the trigger's
   own focus-visible only needs to suppress the browser default, not draw a second ring. */
.tandiko-dropdown-trigger:focus-visible {
  outline: none;
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
