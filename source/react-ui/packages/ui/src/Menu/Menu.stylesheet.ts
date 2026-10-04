/**
 * `<Menu>`'s own styles, injected as an inline `<style>` rather than a `.css` import so the
 * package can stay `"sideEffects": false` (same approach as `Popover`'s and `Card`'s stylesheets).
 *
 * Every `--vpg-*` property is *read* here through `var()` and never assigned inline by the
 * component: an inline style declaration always wins over a stylesheet rule for the same property
 * on the same element, so an inline `--vpg-surface-raised` would permanently shadow the
 * dark-mode reassignment in `@vipengele/react-tokens`'s base stylesheet and this panel would stop
 * adapting to colour mode. The component's only inline style is floating-ui's computed
 * `position`/`top`/`left`, which are plain CSS properties carrying a per-instance coordinate.
 *
 * The panel stacks on the menu step of the layer scale, level with a listbox and above a popover,
 * so a menu opened from inside a popover's panel paints over it. It reads the same raised-surface
 * tokens as the listbox and carries the elevation family's medium step, as a listbox does: both
 * are short-lived lists of rows hanging off a control.
 */
export const menuStylesheet = `
.vpg-menu-trigger {
  /* Inline-flex rather than inline: the wrapper exists only to carry the ref and the click
     handler, and must not add a baseline gap under the element it wraps. */
  display: inline-flex;
}

.vpg-menu {
  position: absolute;
  z-index: var(--vpg-layer-menu);
  box-sizing: border-box;
  margin: 0;
  padding: var(--vpg-space-1);
  /* The size of a container, not steps of anything: no scale carries a measurement this large,
     and a \`--vpg-*\` name the theme never assigns advertises a theming hook that doesn't
     exist. */
  min-width: 10rem;
  max-width: 20rem;
  max-height: 20rem;
  overflow-y: auto;
  background-color: var(--vpg-surface-raised);
  border: 1px solid var(--vpg-border);
  border-radius: var(--vpg-radius);
  box-shadow: var(--vpg-shadow-med);
  color: var(--vpg-ink);
  font-family: var(--vpg-font-sans);
  font-size: var(--vpg-font-size-sm);
  line-height: 1.5;
}

.vpg-menu:focus-visible {
  /* The panel itself takes focus when it holds no focusable row; the ring is what makes that
     visible. Offset rather than inset so it stays legible against the panel's own surface. */
  outline: var(--vpg-focus-ring-width) solid var(--vpg-accent-ring);
  outline-offset: var(--vpg-focus-ring-offset);
}

.vpg-menu-item {
  display: flex;
  align-items: center;
  gap: var(--vpg-space-2);
  box-sizing: border-box;
  /* A row's height is a token read, not the sum of a padding and a line-height, so an icon's box
     or a label's font metrics never change it. */
  min-height: var(--vpg-size-md);
  padding-inline: var(--vpg-space-3);
  border-radius: var(--vpg-radius-sm);
  cursor: pointer;
  user-select: none;
  transition: background-color var(--vpg-duration-fast) var(--vpg-ease-standard);
}

/* Real focus sits on the row, and the pointer moves it there on hover, so focus is the one
   highlight for keyboard and pointer alike. The background is the highlight; the panel already
   frames the row, so no outline is drawn. */
.vpg-menu-item:focus {
  outline: none;
  background-color: var(--vpg-surface-hover);
}

/* A disabled row still takes focus — it keeps its place in the arrow-key order — so it keeps the
   focus highlight too, and only its ink and cursor say it does nothing. */
.vpg-menu-item[aria-disabled="true"] {
  color: var(--vpg-ink-subtle);
  cursor: default;
}

.vpg-menu-item-icon {
  display: inline-flex;
  flex: none;
  width: var(--vpg-icon-md);
  height: var(--vpg-icon-md);
  color: var(--vpg-ink-muted);
}

.vpg-menu-item-label {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.vpg-menu-item-shortcut {
  flex: none;
  color: var(--vpg-ink-subtle);
  font-size: var(--vpg-font-size-xs);
}

/* Bleeds through the panel's padding, so the rule spans the panel's full width rather than
   stopping at a row's edge. */
.vpg-menu-separator {
  height: 1px;
  border: 0;
  margin-block: var(--vpg-space-1);
  margin-inline: calc(var(--vpg-space-1) * -1);
  background-color: var(--vpg-border);
}

.vpg-menu-group-label {
  padding-block: var(--vpg-space-1);
  padding-inline: var(--vpg-space-3);
  color: var(--vpg-ink-subtle);
  font-size: var(--vpg-font-size-xs);
  font-weight: var(--vpg-font-weight-medium);
}
`;
