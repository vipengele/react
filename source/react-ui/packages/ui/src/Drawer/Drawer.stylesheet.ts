/**
 * `<Drawer>`'s own styles, injected as an inline `<style>` rather than a `.css` import so the
 * package can stay `"sideEffects": false` (same approach as `Dialog`'s stylesheet).
 *
 * Every `--vpg-*` property is *read* here through `var()` and never assigned inline by the
 * component: an inline declaration always wins over a stylesheet rule for the same property on the
 * same element, so an inline `--vpg-surface-raised` would shadow the dark-mode reassignment in
 * `@vipengele/react-tokens`'s base stylesheet and the drawer would stop adapting to colour mode.
 *
 * The `<dialog>` is a transparent, borderless box with no padding; the panel inside it fills it
 * entirely and carries the surface, the padding and the scroll. A click whose target is the
 * `<dialog>` itself is therefore always a backdrop click, and neither a border nor a scrollbar
 * belongs to the `<dialog>`, where pressing it would read as one. The panel rounds only the corners
 * that face the page, and draws its border only along the edge that faces the page.
 *
 * The `<dialog>` never clips. It carries `data-vpg-overlay-root`, so a `Popover` or `Dropdown`
 * opened from inside it portals into it and positions absolutely against it; a clipping drawer
 * would cut off a listbox hanging past its edge.
 *
 * Each side is matched through `:where()`, so a side rule weighs no more than the `.vpg-drawer`
 * class alone and a consumer's `className` can resize the drawer with a single class selector.
 * The sides are physical: a `"left"` drawer is on the left in a right-to-left document too.
 *
 * A modal drawer sits in the top layer, so it takes no `--vpg-layer-*` step: the top layer paints
 * above every `z-index`. A non-modal drawer, `[data-modal="false"]`, is a `<div>` on the page layer
 * at the `--vpg-layer-drawer` step, with no backdrop; it is rendered only while open, so it needs no
 * `[open]` to show. `::backdrop` inherits from the `<dialog>`, so its `var()` reads resolve against
 * the same themed root, and its scrim is the ink colour at reduced alpha, as `Dialog`'s is.
 *
 * Only the entry animates: the drawer slides in from its side. `close()` takes the dialog out of
 * the top layer and hides it in the same step, and a closed non-modal drawer leaves the DOM, so
 * there is no frame left to animate an exit in. The
 * duration comes from the theme, whose reduced-motion rule collapses it.
 */
export const drawerStylesheet = `
.vpg-drawer {
  box-sizing: border-box;
  position: fixed;
  margin: 0;
  padding: 0;
  overflow: visible;
  background: transparent;
  border: 0;
  color: var(--vpg-ink);
  font-family: var(--vpg-font-sans);
  font-size: var(--vpg-font-size-md);
  line-height: 1.5;
  transform: none;
  transition: transform var(--vpg-duration-slow) var(--vpg-ease-entrance);
}

.vpg-drawer:where([data-side="left"], [data-side="right"]) {
  inset-block: 0;
  /* A readable column, capped so a strip of backdrop stays visible beside it on a narrow
     viewport. */
  width: min(var(--vpg-width-sm), 100% - var(--vpg-space-6));
  max-width: none;
  height: 100%;
  max-height: none;
}

.vpg-drawer:where([data-side="left"]) {
  left: 0;
  right: auto;
}

.vpg-drawer:where([data-side="right"]) {
  left: auto;
  right: 0;
}

.vpg-drawer:where([data-side="top"], [data-side="bottom"]) {
  inset-inline: 0;
  width: 100%;
  max-width: none;
  height: auto;
  max-height: 85%;
}

.vpg-drawer:where([data-side="top"]) {
  top: 0;
  bottom: auto;
}

.vpg-drawer:where([data-side="bottom"]) {
  top: auto;
  bottom: 0;
}

/* Keyed on \`[open]\` so the flex layout never overrides the user-agent \`display: none\` that hides a
   closed dialog. The column lets the panel fill the drawer and shrink to its capped height. */
.vpg-drawer[open],
.vpg-drawer[data-modal="false"] {
  display: flex;
  flex-direction: column;
}

.vpg-drawer[data-modal="false"] {
  z-index: var(--vpg-layer-drawer);
}

.vpg-drawer::backdrop {
  background-color: oklch(from var(--vpg-ink) l c h / 0.4);
  opacity: 1;
  transition: opacity var(--vpg-duration-slow) var(--vpg-ease-entrance);
}

@starting-style {
  .vpg-drawer[open]:where([data-side="left"]),
  .vpg-drawer[data-modal="false"]:where([data-side="left"]) {
    transform: translateX(-100%);
  }

  .vpg-drawer[open]:where([data-side="right"]),
  .vpg-drawer[data-modal="false"]:where([data-side="right"]) {
    transform: translateX(100%);
  }

  .vpg-drawer[open]:where([data-side="top"]),
  .vpg-drawer[data-modal="false"]:where([data-side="top"]) {
    transform: translateY(-100%);
  }

  .vpg-drawer[open]:where([data-side="bottom"]),
  .vpg-drawer[data-modal="false"]:where([data-side="bottom"]) {
    transform: translateY(100%);
  }

  .vpg-drawer[open]::backdrop {
    opacity: 0;
  }
}

.vpg-drawer-panel {
  box-sizing: border-box;
  flex: 1 1 auto;
  min-height: 0;
  padding: var(--vpg-space-6);
  overflow: auto;
  overflow-wrap: break-word;
  background-color: var(--vpg-surface-raised);
  box-shadow: var(--vpg-shadow-high);
}

.vpg-drawer:where([data-side="left"]) > .vpg-drawer-panel {
  border-right: 1px solid var(--vpg-border);
  border-radius: 0 var(--vpg-radius-lg) var(--vpg-radius-lg) 0;
}

.vpg-drawer:where([data-side="right"]) > .vpg-drawer-panel {
  border-left: 1px solid var(--vpg-border);
  border-radius: var(--vpg-radius-lg) 0 0 var(--vpg-radius-lg);
}

.vpg-drawer:where([data-side="top"]) > .vpg-drawer-panel {
  border-bottom: 1px solid var(--vpg-border);
  border-radius: 0 0 var(--vpg-radius-lg) var(--vpg-radius-lg);
}

.vpg-drawer:where([data-side="bottom"]) > .vpg-drawer-panel {
  border-top: 1px solid var(--vpg-border);
  border-radius: var(--vpg-radius-lg) var(--vpg-radius-lg) 0 0;
}

.vpg-drawer:focus-visible {
  /* The drawer itself takes focus when it holds nothing focusable. */
  outline: var(--vpg-focus-ring-width) solid var(--vpg-accent-ring);
  outline-offset: calc(var(--vpg-focus-ring-offset) * -1);
}
`;
