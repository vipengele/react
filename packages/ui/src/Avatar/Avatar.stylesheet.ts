/**
 * `<Avatar>`'s own styles, injected as an inline `<style>` rather than a `.css` import so the
 * package can stay `"sideEffects": false` (same approach as `@tandiko/tokens`'s base stylesheet
 * and `Button`'s stylesheet).
 *
 * Every `--tandiko-*` property is *read* here through `var()` and never assigned inline by the
 * component: an inline style declaration always wins over a stylesheet rule for the same
 * property on the same element, so an inline `--tandiko-surface-raised` would permanently
 * shadow the dark-mode reassignment in `@tandiko/tokens`'s base stylesheet and this avatar
 * would stop adapting to colour mode.
 *
 * The circle takes steps of the size scale and the initials steps of the type scale.
 * `--tandiko-avatar-size-xl` and `--tandiko-avatar-text-sm` name steps `@tandiko/tokens` doesn't
 * define, so those two reads carry a fallback.
 */
export const avatarStylesheet = `
.tandiko-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  box-sizing: border-box;
  overflow: hidden;
  background-color: var(--tandiko-surface-raised);
  color: var(--tandiko-ink-muted);
  font-family: inherit;
  font-weight: 500;
  line-height: 1;
  /* The fallback content is centred text or a glyph; without this, a long initials string
     would be selectable and could wrap out of the frame. */
  user-select: none;
}

.tandiko-avatar-circle {
  border-radius: 50%;
}

.tandiko-avatar-square {
  border-radius: var(--tandiko-radius);
}

.tandiko-avatar-sm {
  width: var(--tandiko-size-xs);
  height: var(--tandiko-size-xs);
  font-size: var(--tandiko-avatar-text-sm, 0.625rem);
}

.tandiko-avatar-md {
  width: var(--tandiko-size-md);
  height: var(--tandiko-size-md);
  font-size: var(--tandiko-font-size-xs);
}

.tandiko-avatar-lg {
  width: var(--tandiko-size-xl);
  height: var(--tandiko-size-xl);
  font-size: var(--tandiko-font-size-sm);
}

.tandiko-avatar-xl {
  width: var(--tandiko-avatar-size-xl, 3.5rem);
  height: var(--tandiko-avatar-size-xl, 3.5rem);
  font-size: var(--tandiko-font-size-lg);
}

.tandiko-avatar-image {
  width: 100%;
  height: 100%;
  /* \`cover\` rather than \`contain\`: a non-square photo is cropped to the frame instead of
     letterboxed against the surface colour. */
  object-fit: cover;
  display: block;
}

.tandiko-avatar-icon {
  /* Proportional to the frame, so one rule sizes the glyph across the whole size scale. */
  width: 60%;
  height: 60%;
}
`;
