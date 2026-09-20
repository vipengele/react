/**
 * `<ButtonGroup>`'s own styles, injected as an inline `<style>` rather than a `.css` import so
 * the package can stay `"sideEffects": false` (same approach as `Button`'s and `Typography`'s
 * stylesheets).
 *
 * `ButtonGroup` never touches its `<Button>` children — no `cloneElement`, no context — so the
 * attached look is entirely a set of descendant/sibling selectors here, targeting `.vpg-
 * button` directly. That makes `Button`'s rendered class name a contract: renaming it without a
 * matching change here silently breaks the segmented styling with no type error to catch it.
 */
export const buttonGroupStylesheet = `
.vpg-button-group {
  display: inline-flex;
}

.vpg-button-group-horizontal {
  flex-direction: row;
}

.vpg-button-group-vertical {
  flex-direction: column;
}

/* Adjacent buttons overlap their shared border by one pixel rather than doubling it, and only
   the outer corners of the group stay rounded. */
.vpg-button-group-horizontal > .vpg-button {
  border-radius: 0;
}

.vpg-button-group-horizontal > .vpg-button:first-child {
  border-top-left-radius: var(--vpg-radius);
  border-bottom-left-radius: var(--vpg-radius);
}

.vpg-button-group-horizontal > .vpg-button:last-child {
  border-top-right-radius: var(--vpg-radius);
  border-bottom-right-radius: var(--vpg-radius);
}

.vpg-button-group-horizontal > .vpg-button + .vpg-button {
  margin-left: -1px;
}

.vpg-button-group-vertical > .vpg-button {
  border-radius: 0;
}

.vpg-button-group-vertical > .vpg-button:first-child {
  border-top-left-radius: var(--vpg-radius);
  border-top-right-radius: var(--vpg-radius);
}

.vpg-button-group-vertical > .vpg-button:last-child {
  border-bottom-left-radius: var(--vpg-radius);
  border-bottom-right-radius: var(--vpg-radius);
}

.vpg-button-group-vertical > .vpg-button + .vpg-button {
  margin-top: -1px;
}

/* A focused or hovered button's border should read as whole rather than being clipped under
   its neighbour's overlap. */
.vpg-button-group > .vpg-button:focus-visible,
.vpg-button-group > .vpg-button:hover {
  position: relative;
  z-index: 1;
}
`;
