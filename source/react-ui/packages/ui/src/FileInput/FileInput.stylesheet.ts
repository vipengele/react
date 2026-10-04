/**
 * `<FileInput>`'s own styles, injected as an inline `<style>` rather than a `.css` import so the
 * package can stay `"sideEffects": false`.
 *
 * Every `--vpg-*` property is *read* here through `var()` and never assigned inline by the
 * component: an inline style declaration always wins over a stylesheet rule for the same property
 * on the same element, so an inline theme property would permanently shadow the dark-mode
 * reassignment in `@vipengele/react-tokens`'s base stylesheet and the zone would stop adapting to
 * colour mode.
 *
 * The root is the drop zone, and the native `<input type="file">` is its direct child, clipped to
 * 1px so it takes no space while staying focusable and in the accessibility tree. An outline on a
 * 1px clip is invisible, so the zone draws the input's focus ring through
 * `:has(> input:focus-visible)`; the same `> input` scoping reads the input's disabled state and
 * nothing deeper in the zone. Measurements are scale steps: padding and gap from the spacing
 * scale, the floor height from the size scale, the corner from the radius ladder.
 */
export const fileInputStylesheet = `
.vpg-file-input {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--vpg-space-2);
  box-sizing: border-box;
  min-height: var(--vpg-size-2xl);
  padding: var(--vpg-space-5) var(--vpg-space-4);
  background-color: var(--vpg-surface);
  border: 1px dashed var(--vpg-border-strong);
  border-radius: var(--vpg-radius);
  color: var(--vpg-ink);
  font-family: var(--vpg-font-sans);
  text-align: center;
  cursor: pointer;
  transition: border-color var(--vpg-duration-fast) var(--vpg-ease-standard),
    background-color var(--vpg-duration-fast) var(--vpg-ease-standard),
    opacity var(--vpg-duration-fast) var(--vpg-ease-standard);
}

.vpg-file-input:hover {
  border-color: var(--vpg-accent);
  background-color: var(--vpg-surface-hover);
}

.vpg-file-input:has(> input:focus-visible) {
  outline: var(--vpg-focus-ring-width) solid var(--vpg-accent-ring);
  outline-offset: var(--vpg-focus-ring-offset);
}

.vpg-file-input[data-dragging] {
  border-color: var(--vpg-accent);
  background-color: var(--vpg-accent-wash);
}

.vpg-file-input:has(> input:disabled) {
  border-color: var(--vpg-border);
  background-color: var(--vpg-surface);
  cursor: not-allowed;
  opacity: 0.55;
}

.vpg-file-input-prompt {
  font-size: var(--vpg-font-size-sm);
  line-height: var(--vpg-line-height-snug);
  color: var(--vpg-ink-muted);
}

/* Keeps the native input focusable and announced while it takes no visual space. */
.vpg-file-input > input {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
`;
