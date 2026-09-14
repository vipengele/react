/**
 * `<ButtonGroup>`'s own styles, injected as an inline `<style>` rather than a `.css` import so
 * the package can stay `"sideEffects": false` (same approach as `Button`'s and `Typography`'s
 * stylesheets).
 *
 * `ButtonGroup` never touches its `<Button>` children — no `cloneElement`, no context — so the
 * attached look is entirely a set of descendant/sibling selectors here, targeting `.tandiko-
 * button` directly. That makes `Button`'s rendered class name a contract: renaming it without a
 * matching change here silently breaks the segmented styling with no type error to catch it.
 */
export const buttonGroupStylesheet = `
.tandiko-button-group {
  display: inline-flex;
}

.tandiko-button-group-horizontal {
  flex-direction: row;
}

.tandiko-button-group-vertical {
  flex-direction: column;
}

/* Adjacent buttons overlap their shared border by one pixel rather than doubling it, and only
   the outer corners of the group stay rounded. */
.tandiko-button-group-horizontal > .tandiko-button {
  border-radius: 0;
}

.tandiko-button-group-horizontal > .tandiko-button:first-child {
  border-top-left-radius: var(--tandiko-radius);
  border-bottom-left-radius: var(--tandiko-radius);
}

.tandiko-button-group-horizontal > .tandiko-button:last-child {
  border-top-right-radius: var(--tandiko-radius);
  border-bottom-right-radius: var(--tandiko-radius);
}

.tandiko-button-group-horizontal > .tandiko-button + .tandiko-button {
  margin-left: -1px;
}

.tandiko-button-group-vertical > .tandiko-button {
  border-radius: 0;
}

.tandiko-button-group-vertical > .tandiko-button:first-child {
  border-top-left-radius: var(--tandiko-radius);
  border-top-right-radius: var(--tandiko-radius);
}

.tandiko-button-group-vertical > .tandiko-button:last-child {
  border-bottom-left-radius: var(--tandiko-radius);
  border-bottom-right-radius: var(--tandiko-radius);
}

.tandiko-button-group-vertical > .tandiko-button + .tandiko-button {
  margin-top: -1px;
}

/* A focused or hovered button's border should read as whole rather than being clipped under
   its neighbour's overlap. */
.tandiko-button-group > .tandiko-button:focus-visible,
.tandiko-button-group > .tandiko-button:hover {
  position: relative;
  z-index: 1;
}
`;
