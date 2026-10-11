/**
 * `<TimeField>`'s own styles, injected as an inline `<style>` rather than a `.css` import so the
 * package can stay `"sideEffects": false` (same approach as every other component's stylesheet).
 *
 * Every `--vpg-*` property is *read* here through `var()` and never assigned inline by the
 * component: an inline style declaration always wins over a stylesheet rule for the same property
 * on the same element, so an inline `--vpg-ink` would permanently shadow `@vipengele/react-tokens`'s
 * dark-mode reassignment and this field would stop adapting to colour mode.
 *
 * The group sits inside a `FieldShell`, so it carries nothing the shell owns: no border, no
 * background, no radius, no width, no box-shadow, and no rule for the hover, focus, invalid or
 * disabled states. The shell reads all of those off the group itself, which is its marked control.
 * Height is the shell's too: `align-self: stretch` takes it rather than restating it.
 *
 * A segment marks itself while it holds focus, whichever way focus arrived. The shell's ring
 * answers keyboard focus only, so without the segment's own fill a pointer-focused field would not
 * show which segment the next digit goes into. `font-variant-numeric: tabular-nums` keeps every
 * digit on one advance, so a segment does not change width as its value steps.
 */
export const timeFieldStylesheet = `
.vpg-time-field {
  display: inline-flex;
  align-items: center;
  align-self: stretch;
  min-width: 0;
  color: inherit;
  font-family: var(--vpg-font-sans);
  font-size: var(--vpg-font-size-sm);
  font-variant-numeric: tabular-nums;
  line-height: 1.5;
  white-space: nowrap;
}

.vpg-time-field-segment {
  box-sizing: border-box;
  padding: 0 var(--vpg-space-1);
  border-radius: var(--vpg-radius-sm);
  outline: none;
  text-align: center;
  caret-color: transparent;
}

.vpg-time-field-segment[data-empty] {
  color: var(--vpg-ink-subtle);
}

.vpg-time-field-segment:focus {
  background-color: var(--vpg-accent-wash);
  color: var(--vpg-ink);
}

.vpg-time-field-literal {
  color: var(--vpg-ink-muted);
}
`;
