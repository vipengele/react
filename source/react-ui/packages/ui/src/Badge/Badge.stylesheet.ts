/**
 * `<Badge>`'s own styles, injected as an inline `<style>` rather than a `.css` import so the
 * package can stay `"sideEffects": false` (same approach as `@vipengele/react-tokens`'s base stylesheet
 * and `Button`'s stylesheet).
 *
 * Every `--vpg-*` property is *read* here through `var()` and never assigned inline by the
 * component: an inline style declaration always wins over a stylesheet rule for the same
 * property on the same element, so an inline `--vpg-accent-wash` would permanently shadow the
 * dark-mode reassignment in `@vipengele/react-tokens`'s base stylesheet and this badge would stop
 * adapting to colour mode.
 *
 * Heights take steps of the size scale, labels steps of the type scale and the icon a step of
 * the icon scale. Every variant carries a 1px border, transparent unless the variant draws one,
 * so a neutral subtle badge with its outline is exactly as tall as every other badge of its size.
 */
export const badgeStylesheet = `
.vpg-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--vpg-space-1);
  box-sizing: border-box;
  vertical-align: middle;
  border: 1px solid transparent;
  border-radius: var(--vpg-radius-full);
  font-family: inherit;
  font-weight: 500;
  line-height: 1;
  white-space: nowrap;
}

.vpg-badge-sm {
  height: var(--vpg-size-xs);
  padding-inline: var(--vpg-space-2);
  font-size: var(--vpg-font-size-xs);
}

.vpg-badge-md {
  height: var(--vpg-size-sm);
  padding-inline: var(--vpg-space-3);
  font-size: var(--vpg-font-size-sm);
}

.vpg-badge-icon {
  display: inline-flex;
  flex: none;
}

/* The slot takes any node, so the size is set on whatever graphic the caller passes. Its colour
   is left alone: an icon stroked or filled with \`currentColor\` follows the variant's text. */
.vpg-badge-icon > * {
  width: 100%;
  height: 100%;
}

.vpg-badge-sm .vpg-badge-icon {
  width: var(--vpg-icon-sm);
  height: var(--vpg-icon-sm);
}

.vpg-badge-md .vpg-badge-icon {
  width: var(--vpg-icon-md);
  height: var(--vpg-icon-md);
}

.vpg-badge-neutral.vpg-badge-subtle {
  background-color: var(--vpg-surface-sunken);
  border-color: var(--vpg-border);
  color: var(--vpg-ink);
}

.vpg-badge-neutral.vpg-badge-solid {
  background-color: var(--vpg-ink);
  color: var(--vpg-surface);
}

.vpg-badge-accent.vpg-badge-subtle {
  background-color: var(--vpg-accent-wash);
  color: var(--vpg-ink);
}

.vpg-badge-accent.vpg-badge-solid {
  background-color: var(--vpg-accent);
  color: var(--vpg-accent-contrast);
}

.vpg-badge-danger.vpg-badge-subtle {
  background-color: var(--vpg-danger-wash);
  color: var(--vpg-ink);
}

.vpg-badge-danger.vpg-badge-solid {
  background-color: var(--vpg-danger);
  color: var(--vpg-danger-contrast);
}
`;
