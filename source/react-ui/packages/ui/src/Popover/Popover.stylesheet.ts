/**
 * `<Popover>`'s own styles, injected as an inline `<style>` rather than a `.css` import so the
 * package can stay `"sideEffects": false` (same approach as `Button`'s and `Card`'s stylesheets).
 *
 * Every `--vpg-*` property is *read* here through `var()` and never assigned inline by the
 * component: an inline style declaration always wins over a stylesheet rule for the same property
 * on the same element, so an inline `--vpg-surface-raised` would permanently shadow the
 * dark-mode reassignment in `@vipengele/react-tokens`'s base stylesheet and this panel would stop adapting
 * to colour mode. The component's only inline style is floating-ui's computed
 * `position`/`top`/`left`, which are plain CSS properties carrying a per-instance coordinate.
 *
 * The panel reads the same raised-surface tokens as `Card` — `--vpg-surface-raised`,
 * `--vpg-border`, `--vpg-radius` — so a floating panel and a card in the page body read as
 * the same material.
 *
 * The panel sits above a listbox and below a tooltip in the stacking family — it is a surface
 * over the page that can contain the control a listbox belongs to — and carries the elevation
 * family's high step, whose two layers re-derive their inks when the colour mode flips.
 */
export const popoverStylesheet = `
.vpg-popover-trigger {
  /* Inline-flex rather than inline: the wrapper exists only to carry the ref and the click
     handler, and must not add a baseline gap under the element it wraps. */
  display: inline-flex;
}

.vpg-popover {
  position: absolute;
  z-index: var(--vpg-layer-popover);
  box-sizing: border-box;
  /* The size of a container, not a step of anything: no scale carries a measurement this large,
     and a \`--vpg-*\` name the theme never assigns advertises a theming hook that doesn't
     exist. */
  max-width: 20rem;
  padding: 1rem;
  background-color: var(--vpg-surface-raised);
  border: 1px solid var(--vpg-border);
  border-radius: var(--vpg-radius);
  box-shadow: var(--vpg-shadow-high);
  color: var(--vpg-ink);
  font-family: var(--vpg-font-sans);
  font-size: var(--vpg-font-size-sm);
  line-height: 1.5;
  /* The panel holds interactive content, so unlike a tooltip it must stay hit-testable. */
  overflow-wrap: break-word;
}

.vpg-popover:focus-visible {
  /* The panel itself takes focus when it holds nothing tabbable; the ring is what makes that
     visible. Offset rather than inset so it stays legible against the panel's own surface. */
  outline: var(--vpg-focus-ring-width) solid var(--vpg-accent-ring);
  outline-offset: var(--vpg-focus-ring-offset);
}
`;
