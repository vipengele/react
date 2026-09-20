/**
 * `<Tooltip>`'s own styles, injected as an inline `<style>` rather than a `.css` import so the
 * package can stay `"sideEffects": false` (same approach as `Button`'s and `Avatar`'s
 * stylesheets).
 *
 * Every `--vpg-*` property is *read* here through `var()` and never assigned inline by the
 * component: an inline style declaration always wins over a stylesheet rule for the same
 * property on the same element, so an inline `--vpg-ink` would permanently shadow the
 * dark-mode reassignment in `@vipengele/react-tokens`'s base stylesheet and this tooltip would stop
 * adapting to colour mode. The component's only inline style is floating-ui's computed
 * `position`/`top`/`left`, which are plain CSS properties carrying a per-instance coordinate.
 *
 * The bubble inverts the surface: `--vpg-ink` as background against `--vpg-surface` as
 * text. Both flip together with colour mode, so a small floating label keeps the widest contrast
 * the theme offers in either mode without hard-coding a colour.
 *
 * The label takes a step of the type scale, and the bubble the top step of the stacking family:
 * a tooltip can be triggered from inside any other floating surface and must never be occluded by
 * its own trigger.
 */
export const tooltipStylesheet = `
.vpg-tooltip-trigger {
  /* Inline-flex rather than inline: the wrapper exists only to carry the ref and the hover/focus
     handlers, and must not add a baseline gap under the element it wraps. */
  display: inline-flex;
}

.vpg-tooltip {
  position: absolute;
  z-index: var(--vpg-layer-tooltip);
  box-sizing: border-box;
  /* The size of a container, not a step of anything: no scale carries a measurement this large,
     and a \`--vpg-*\` name the theme never assigns advertises a theming hook that doesn't
     exist. */
  max-width: 16rem;
  padding: 0.25rem 0.5rem;
  border-radius: var(--vpg-radius-sm);
  background-color: var(--vpg-ink);
  color: var(--vpg-surface);
  font-family: var(--vpg-font-sans);
  font-size: var(--vpg-font-size-xs);
  line-height: 1.4;
  /* A tooltip that could be hovered would sit between the pointer and the trigger and flicker
     the trigger's own hover state off. */
  pointer-events: none;
  /* Long content wraps against max-width instead of stretching off-screen; an explicit newline
     in the content is still honoured. */
  white-space: pre-line;
  overflow-wrap: break-word;
}
`;
