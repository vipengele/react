/**
 * The floating listbox, its options, the option checkbox and the multi-select chips — the parts
 * every combobox-shaped component in this package renders identically. It lives here, injected
 * under its own `<style href>` by each component that needs it, rather than being duplicated per
 * component or imported from one component's directory into another's.
 *
 * Injected as an inline `<style>` rather than a `.css` import so the package can stay
 * `"sideEffects": false` (same approach as `Card`'s and `Popover`'s stylesheets).
 *
 * Every `--tandiko-*` property is *read* here through `var()` and never assigned inline by a
 * component: an inline style declaration always wins over a stylesheet rule for the same property
 * on the same element, so an inline `--tandiko-surface-raised` would permanently shadow the
 * dark-mode reassignment in `@tandiko/tokens`'s base stylesheet and the listbox would stop
 * adapting to colour mode. The only inline style any of these elements carries is floating-ui's
 * computed `position`/`top`/`left`, which are plain CSS properties holding a per-instance
 * coordinate.
 *
 * `--tandiko-listbox-shadow` and `--tandiko-typography-body-md-size` have no definition in
 * `@tandiko/tokens`, so those reads carry fallbacks (same convention as
 * `Typography.stylesheet.ts` and `Popover.stylesheet.ts`).
 */
export const listboxStylesheet = `
.tandiko-listbox {
  position: absolute;
  z-index: var(--tandiko-layer-listbox);
  box-sizing: border-box;
  margin: 0;
  padding: 0.375rem;
  /* The size of a container, not steps of anything: no scale carries measurements this large,
     and a \`--tandiko-*\` name the theme never assigns advertises a theming hook that doesn't
     exist. */
  min-width: 12rem;
  max-height: 16rem;
  overflow-y: auto;
  background-color: var(--tandiko-surface-raised);
  border: 1px solid var(--tandiko-border);
  border-radius: var(--tandiko-radius);
  box-shadow:
    0 0.25rem 0.5rem var(--tandiko-listbox-shadow, rgb(0 0 0 / 0.08)),
    0 0.75rem 2rem var(--tandiko-listbox-shadow, rgb(0 0 0 / 0.1));
  color: var(--tandiko-ink);
  font-family: var(--tandiko-font-sans);
  font-size: var(--tandiko-typography-body-md-size, 1rem);
  line-height: 1.5;
}

.tandiko-listbox:focus-visible {
  /* The listbox takes DOM focus from nothing — the highlight is virtual — but it is still a
     focus target for a stray programmatic focus() call, and an invisible one reads as broken. */
  outline: 2px solid var(--tandiko-accent-ring);
  outline-offset: 2px;
}

.tandiko-listbox-option {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  box-sizing: border-box;
  padding: 0.5rem 0.625rem;
  border-radius: var(--tandiko-radius-sm);
  cursor: pointer;
  transition: background-color 100ms ease;
  /* The highlight moves with the keyboard, not with the pointer, so an option must never look
     selectable-by-drag. */
  user-select: none;
}

/* The highlight is virtual — the option never takes DOM focus, so :focus/:hover cannot express
   it and the component sets this attribute from its own highlighted index instead. */
.tandiko-listbox-option[data-highlighted] {
  background-color: var(--tandiko-surface-hover);
}

.tandiko-listbox-option[aria-selected="true"] {
  color: var(--tandiko-accent);
  font-weight: 500;
}

.tandiko-listbox-option[aria-disabled="true"] {
  color: var(--tandiko-ink-subtle);
  cursor: default;
}

.tandiko-listbox-option-icon {
  flex: none;
}

.tandiko-listbox-option-label {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* A drawn box rather than an <input type="checkbox">: the option already carries
   role="option" + aria-selected, and a real checkbox inside it would be an interactive
   element nested in one. */
.tandiko-listbox-checkbox {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: none;
  box-sizing: border-box;
  width: 1.125rem;
  height: 1.125rem;
  border: 1px solid var(--tandiko-border-strong);
  border-radius: var(--tandiko-radius-sm);
  color: var(--tandiko-accent-contrast);
  transition: background-color 100ms ease, border-color 100ms ease;
}

.tandiko-listbox-checkbox[data-checked] {
  background-color: var(--tandiko-accent);
  border-color: var(--tandiko-accent);
}

.tandiko-listbox-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  box-sizing: border-box;
  padding: 0.1875rem 0.375rem 0.1875rem 0.625rem;
  background-color: var(--tandiko-accent-wash);
  border: 1px solid transparent;
  border-radius: var(--tandiko-radius-full);
  color: var(--tandiko-ink);
  font-family: var(--tandiko-font-sans);
  font-size: var(--tandiko-font-size-sm);
  line-height: 1.5;
}

.tandiko-listbox-chip-remove {
  display: flex;
  align-items: center;
  justify-content: center;
  appearance: none;
  padding: 0.125rem;
  background: none;
  border: none;
  border-radius: var(--tandiko-radius-full);
  color: var(--tandiko-ink-muted);
  cursor: pointer;
  transition: background-color 100ms ease, color 100ms ease;
}

.tandiko-listbox-chip-remove:hover {
  background-color: var(--tandiko-accent-wash);
  color: var(--tandiko-ink);
}

.tandiko-listbox-chip-remove:focus-visible {
  outline: 2px solid var(--tandiko-accent-ring);
  outline-offset: 1px;
}
`;
