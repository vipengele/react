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
 * adapting to colour mode. The only inline styles any of these elements carry are floating-ui's
 * computed `position`/`top`/`left`/`width`, which are plain CSS properties holding a per-instance
 * coordinate and the panel's match to the field it anchors to.
 *
 * An option's own text is a control's text, so it takes the type scale's `sm` step rather than the
 * prose `md` one. The panel carries the elevation family's medium step, one below the popover's.
 */
export const listboxStylesheet = `
.tandiko-listbox {
  position: absolute;
  z-index: var(--tandiko-layer-listbox);
  box-sizing: border-box;
  margin: 0;
  padding: var(--tandiko-space-1);
  /* The size of a container, not steps of anything: no scale carries a measurement this large,
     and a \`--tandiko-*\` name the theme never assigns advertises a theming hook that doesn't
     exist. Width is floating-ui's inline style, matching the field exactly — this rule must
     never impose a floor wider than a narrow field, or the panel outgrows what it's anchored to. */
  max-height: 16rem;
  overflow-y: auto;
  background-color: var(--tandiko-surface-raised);
  border: 1px solid var(--tandiko-border);
  border-radius: var(--tandiko-radius);
  box-shadow: var(--tandiko-shadow-med);
  color: var(--tandiko-ink);
  font-family: var(--tandiko-font-sans);
  font-size: var(--tandiko-font-size-sm);
  line-height: 1.5;
}

.tandiko-listbox:focus-visible {
  /* The listbox takes DOM focus from nothing — the highlight is virtual — but it is still a
     focus target for a stray programmatic focus() call, and an invisible one reads as broken. */
  outline: var(--tandiko-focus-ring-width) solid var(--tandiko-accent-ring);
  outline-offset: var(--tandiko-focus-ring-offset);
}

.tandiko-listbox-option {
  display: flex;
  align-items: center;
  gap: var(--tandiko-space-2);
  box-sizing: border-box;
  /* A row's height is a token read, not the sum of a padding and a line-height: min-height
     plus centred content holds it at the control scale's md step regardless of what the label's
     font metrics or an icon's box happen to add up to. */
  min-height: var(--tandiko-size-md);
  padding-inline: var(--tandiko-space-3);
  border-radius: var(--tandiko-radius-sm);
  cursor: pointer;
  transition: background-color var(--tandiko-duration-fast) var(--tandiko-ease-standard);
  /* The highlight moves with the keyboard, not with the pointer, so an option must never look
     selectable-by-drag. */
  user-select: none;
}

/* The highlight is virtual — the option never takes DOM focus, so :focus/:hover cannot express
   it and the component sets this attribute from its own highlighted index instead. Highlight
   (background) and selection (a checkbox fill or a trailing check, never colour) read on
   different visual channels, so a row can carry both at once without either one washing out the
   other. */
.tandiko-listbox-option[data-highlighted] {
  background-color: var(--tandiko-surface-hover);
}

.tandiko-listbox-option[aria-disabled="true"] {
  color: var(--tandiko-ink-subtle);
  cursor: default;
}

.tandiko-listbox-option-icon {
  flex: none;
  width: var(--tandiko-icon-md);
  height: var(--tandiko-icon-md);
  color: var(--tandiko-ink-muted);
}

/* A single-select row's only selection signal: colour alone would fail WCAG 1.4.1, and
   \`aria-selected\` reaches assistive technology but not a sighted reader. Trailing edge matches
   the shadcn/Radix select convention. A multi-select row already carries the checkbox as its
   one encoding, so this mark never renders alongside it — \`Dropdown\`/\`Autocomplete\` render it
   only for a selected option outside \`multiple\`. */
.tandiko-listbox-option-check {
  flex: none;
  width: var(--tandiko-icon-md);
  height: var(--tandiko-icon-md);
  color: var(--tandiko-accent);
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
  transition: background-color var(--tandiko-duration-fast) var(--tandiko-ease-standard),
    border-color var(--tandiko-duration-fast) var(--tandiko-ease-standard);
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
  outline: var(--tandiko-focus-ring-width) solid var(--tandiko-accent-ring);
  outline-offset: var(--tandiko-focus-ring-offset);
}
`;
