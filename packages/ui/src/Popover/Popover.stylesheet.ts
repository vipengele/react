/**
 * `<Popover>`'s own styles, injected as an inline `<style>` rather than a `.css` import so the
 * package can stay `"sideEffects": false` (same approach as `Button`'s and `Card`'s stylesheets).
 *
 * Every `--tandiko-*` property is *read* here through `var()` and never assigned inline by the
 * component: an inline style declaration always wins over a stylesheet rule for the same property
 * on the same element, so an inline `--tandiko-surface-raised` would permanently shadow the
 * dark-mode reassignment in `@tandiko/tokens`'s base stylesheet and this panel would stop adapting
 * to colour mode. The component's only inline style is floating-ui's computed
 * `position`/`top`/`left`, which are plain CSS properties carrying a per-instance coordinate.
 *
 * The panel reads the same raised-surface tokens as `Card` — `--tandiko-surface-raised`,
 * `--tandiko-border`, `--tandiko-radius` — so a floating panel and a card in the page body read as
 * the same material.
 *
 * `--tandiko-popover-shadow` and `--tandiko-popover-z` have no definition in `@tandiko/tokens`,
 * so those reads carry a fallback.
 */
export const popoverStylesheet = `
.tandiko-popover-trigger {
  /* Inline-flex rather than inline: the wrapper exists only to carry the ref and the click
     handler, and must not add a baseline gap under the element it wraps. */
  display: inline-flex;
}

.tandiko-popover {
  position: absolute;
  z-index: var(--tandiko-popover-z, 1000);
  box-sizing: border-box;
  /* The size of a container, not a step of anything: no scale carries a measurement this large,
     and a \`--tandiko-*\` name the theme never assigns advertises a theming hook that doesn't
     exist. */
  max-width: 20rem;
  padding: 1rem;
  background-color: var(--tandiko-surface-raised);
  border: 1px solid var(--tandiko-border);
  border-radius: var(--tandiko-radius);
  box-shadow: 0 0.5rem 1.5rem var(--tandiko-popover-shadow, rgb(0 0 0 / 0.18));
  color: var(--tandiko-ink);
  font-family: var(--tandiko-font-sans);
  font-size: var(--tandiko-font-size-sm);
  line-height: 1.5;
  /* The panel holds interactive content, so unlike a tooltip it must stay hit-testable. */
  overflow-wrap: break-word;
}

.tandiko-popover:focus-visible {
  /* The panel itself takes focus when it holds nothing tabbable; the ring is what makes that
     visible. Offset rather than inset so it stays legible against the panel's own surface. */
  outline: 2px solid var(--tandiko-accent-ring);
  outline-offset: 2px;
}
`;
