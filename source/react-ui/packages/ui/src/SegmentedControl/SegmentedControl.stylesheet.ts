/**
 * `<SegmentedControl>`'s own styles, injected as an inline `<style>` rather than a `.css` import so
 * the package can stay `"sideEffects": false` (same approach as `Button`'s and `FieldShell`'s
 * stylesheets).
 *
 * Every `--vpg-*` property is *read* here through `var()` and never assigned inline by the
 * component: an inline style declaration always wins over a stylesheet rule for the same property
 * on the same element, so an inline `--vpg-surface-raised` would permanently shadow the dark-mode
 * reassignment in `@vipengele/react-tokens`'s base stylesheet and the control would stop adapting
 * to colour mode.
 *
 * Each segment is a `<label>` wrapping its own visually hidden native radio, and reads every state
 * — selected, focused, disabled — out of that radio. The selected fill belongs to the segment that
 * holds the checked radio rather than to a thumb sliding beneath the row, so nothing is measured
 * and the selection never depends on layout having settled.
 *
 * The state rules match `> ` — the segment's direct child — so each reads the segment's own radio
 * and nothing deeper. A segment's label can be an arbitrary subtree, and an unscoped
 * `:has(:checked)` or `:has(:disabled)` would read a control nested inside that label as the
 * segment's own state.
 *
 * Heights come from the size scale, as `Button`'s do, so a segmented control sits flush beside a
 * button of the same size.
 */
export const segmentedControlStylesheet = `
.vpg-segmented-control {
  display: inline-flex;
  align-items: stretch;
  box-sizing: border-box;
  /* The hairline gap between the track's edge and a selected segment's fill, which the spacing
     ladder has no step for. */
  padding: 2px;
  gap: 2px;
  background-color: var(--vpg-surface-sunken);
  border: 1px solid var(--vpg-border);
  border-radius: var(--vpg-radius);
  font-family: var(--vpg-font-sans);
  line-height: 1;
}

.vpg-segmented-control-sm {
  min-height: var(--vpg-size-sm);
  font-size: var(--vpg-font-size-xs);
}

.vpg-segmented-control-md {
  min-height: var(--vpg-size-md);
  font-size: var(--vpg-font-size-sm);
}

.vpg-segmented-control-lg {
  min-height: var(--vpg-size-xl);
  font-size: var(--vpg-font-size-md);
}

/* Block-level so it takes its container's width; every segment then starts from zero and grows
   by the same factor, so the segments share that width equally whatever their labels hold. */
.vpg-segmented-control-full {
  display: flex;
  width: 100%;
}

.vpg-segmented-control-full > .vpg-segmented-control-segment {
  flex: 1 1 0;
  min-width: 0;
}

.vpg-segmented-control-segment {
  /* The containing block for the hidden radio, so its absolute box stays inside the segment. */
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--vpg-space-2);
  box-sizing: border-box;
  border-radius: var(--vpg-radius-sm);
  background-color: transparent;
  color: var(--vpg-ink-muted);
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
  user-select: none;
  transition: background-color var(--vpg-duration-fast) var(--vpg-ease-standard),
    color var(--vpg-duration-fast) var(--vpg-ease-standard),
    box-shadow var(--vpg-duration-fast) var(--vpg-ease-standard);
}

.vpg-segmented-control-sm > .vpg-segmented-control-segment {
  padding: 0 var(--vpg-space-2);
}

.vpg-segmented-control-md > .vpg-segmented-control-segment {
  padding: 0 var(--vpg-space-3);
}

.vpg-segmented-control-lg > .vpg-segmented-control-segment {
  padding: 0 var(--vpg-space-4);
}

/* Hidden from sight but not from the accessibility tree or the keyboard: the radio is what takes
   focus, what arrow keys move between, and what a form submits. \`display: none\` would remove
   all three. */
.vpg-segmented-control-segment > input {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
  opacity: 0;
}

.vpg-segmented-control-segment:hover:not(:has(> :disabled)) {
  color: var(--vpg-ink);
}

.vpg-segmented-control-segment:has(> :checked) {
  background-color: var(--vpg-surface-raised);
  color: var(--vpg-ink);
  box-shadow: var(--vpg-shadow-low);
}

.vpg-segmented-control-segment:has(> :focus-visible) {
  /* Inset so the ring stays inside the track rather than overlapping the neighbouring segment. */
  outline: var(--vpg-focus-ring-width) solid var(--vpg-accent-ring);
  outline-offset: calc(var(--vpg-focus-ring-offset) * -1);
}

.vpg-segmented-control-segment:has(> :disabled) {
  color: var(--vpg-ink-subtle);
  cursor: not-allowed;
}

.vpg-segmented-control-segment-icon {
  flex: none;
  width: 1em;
  height: 1em;
}
`;
