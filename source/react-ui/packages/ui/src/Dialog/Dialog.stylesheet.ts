/**
 * `<Dialog>`'s own styles, injected as an inline `<style>` rather than a `.css` import so the
 * package can stay `"sideEffects": false` (same approach as `Popover`'s and `Card`'s stylesheets).
 *
 * Every `--vpg-*` property is *read* here through `var()` and never assigned inline by the
 * component: an inline style declaration always wins over a stylesheet rule for the same property
 * on the same element, so an inline `--vpg-surface-raised` would permanently shadow the
 * dark-mode reassignment in `@vipengele/react-tokens`'s base stylesheet and this dialog would stop
 * adapting to colour mode.
 *
 * The `<dialog>` carries the surface and no padding; the panel inside it carries the padding and
 * scrolls. A click whose target is the `<dialog>` itself is therefore always a backdrop click, and
 * a scrollbar never belongs to the `<dialog>`, where pressing it would read as one.
 *
 * The `<dialog>` never clips. It carries `data-vpg-overlay-root`, so a `Popover` or `Dropdown`
 * opened from inside it portals into it and positions absolutely against it; a clipping dialog
 * would cut off a listbox hanging below its bottom edge or a panel reaching past its side. The
 * panel inherits the dialog's corner radius instead, so its own scrolling content still clips to
 * the rounded corners.
 *
 * The dialog sits in the top layer, so it takes no `--vpg-layer-*` step: the top layer paints above
 * every `z-index`. `::backdrop` inherits from the `<dialog>`, so its `var()` reads resolve against
 * the same themed root. Its scrim is the ink colour at reduced alpha rather than a token of its own,
 * so it darkens a light page, lightens a dark one, and follows the seed's hue.
 *
 * Only the entry animates. `close()` takes the dialog out of the top layer and hides it in the same
 * step, so there is no frame left to animate an exit in. The durations come from the theme, whose
 * reduced-motion rule collapses them.
 */
export const dialogStylesheet = `
.vpg-dialog {
  box-sizing: border-box;
  /* The width of a readable column of form content, capped so the backdrop stays visible around
     it on a narrow viewport. */
  max-width: min(var(--vpg-width-sm), calc(100% - 2 * var(--vpg-space-6)));
  max-height: calc(100% - 2 * var(--vpg-space-6));
  padding: 0;
  overflow: visible;
  background-color: var(--vpg-surface-raised);
  border: 1px solid var(--vpg-border);
  border-radius: var(--vpg-radius-lg);
  box-shadow: var(--vpg-shadow-high);
  color: var(--vpg-ink);
  font-family: var(--vpg-font-sans);
  font-size: var(--vpg-font-size-md);
  line-height: 1.5;
  opacity: 1;
  transform: none;
  transition:
    opacity var(--vpg-duration-normal) var(--vpg-ease-entrance),
    transform var(--vpg-duration-normal) var(--vpg-ease-entrance);
}

/* Keyed on \`[open]\` so the flex layout never overrides the user-agent \`display: none\` that hides a
   closed dialog. The column lets the panel shrink to the dialog's capped height and scroll. */
.vpg-dialog[open] {
  display: flex;
  flex-direction: column;
}

.vpg-dialog::backdrop {
  background-color: oklch(from var(--vpg-ink) l c h / 0.4);
  opacity: 1;
  transition: opacity var(--vpg-duration-normal) var(--vpg-ease-entrance);
}

@starting-style {
  .vpg-dialog[open] {
    opacity: 0;
    transform: translateY(var(--vpg-space-2)) scale(0.98);
  }

  .vpg-dialog[open]::backdrop {
    opacity: 0;
  }
}

.vpg-dialog-panel {
  box-sizing: border-box;
  min-height: 0;
  padding: var(--vpg-space-6);
  border-radius: inherit;
  overflow: auto;
  overflow-wrap: break-word;
}

.vpg-dialog:focus-visible {
  /* The dialog itself takes focus when it holds nothing focusable. */
  outline: var(--vpg-focus-ring-width) solid var(--vpg-accent-ring);
  outline-offset: var(--vpg-focus-ring-offset);
}
`;
