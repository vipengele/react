/**
 * `<Avatar>`'s own styles, injected as an inline `<style>` rather than a `.css` import so the
 * package can stay `"sideEffects": false` (same approach as `@vipengele/react-tokens`'s base stylesheet
 * and `Button`'s stylesheet).
 *
 * Every `--vpg-*` property is *read* here through `var()` and never assigned inline by the
 * component: an inline style declaration always wins over a stylesheet rule for the same
 * property on the same element, so an inline `--vpg-surface-raised` would permanently
 * shadow the dark-mode reassignment in `@vipengele/react-tokens`'s base stylesheet and this avatar
 * would stop adapting to colour mode.
 *
 * The circle takes steps of the size scale and the initials steps of the type scale. The `xl`
 * circle takes the size scale's display step, past the range a pointer targets, and the `sm`
 * initials sit on the type scale's floor rather than under it.
 */
export const avatarStylesheet = `
.vpg-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  box-sizing: border-box;
  overflow: hidden;
  background-color: var(--vpg-surface-raised);
  color: var(--vpg-ink-muted);
  font-family: inherit;
  font-weight: 500;
  line-height: 1;
  /* The fallback content is centred text or a glyph; without this, a long initials string
     would be selectable and could wrap out of the frame. */
  user-select: none;
}

.vpg-avatar-circle {
  border-radius: 50%;
}

.vpg-avatar-square {
  border-radius: var(--vpg-radius);
}

.vpg-avatar-sm {
  width: var(--vpg-size-xs);
  height: var(--vpg-size-xs);
  font-size: var(--vpg-font-size-xs);
}

.vpg-avatar-md {
  width: var(--vpg-size-md);
  height: var(--vpg-size-md);
  font-size: var(--vpg-font-size-xs);
}

.vpg-avatar-lg {
  width: var(--vpg-size-xl);
  height: var(--vpg-size-xl);
  font-size: var(--vpg-font-size-sm);
}

.vpg-avatar-xl {
  width: var(--vpg-size-2xl);
  height: var(--vpg-size-2xl);
  font-size: var(--vpg-font-size-lg);
}

.vpg-avatar-image {
  width: 100%;
  height: 100%;
  /* \`cover\` rather than \`contain\`: a non-square photo is cropped to the frame instead of
     letterboxed against the surface colour. */
  object-fit: cover;
  display: block;
}

.vpg-avatar-icon {
  /* Proportional to the frame, so one rule sizes the glyph across the whole size scale. */
  width: 60%;
  height: 60%;
}
`;
