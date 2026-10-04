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
`;
