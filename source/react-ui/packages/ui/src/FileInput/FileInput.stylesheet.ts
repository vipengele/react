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
 *
 * The row list stretches across the zone and reads as content rather than as part of the target:
 * start-aligned, with the default cursor, and the zone's hover wash stays off while the pointer
 * is over it. A row's status is always spelled out in its status text; a failed or rejected row
 * also turns that text and its edge to the danger role, so colour is never the only signal.
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

.vpg-file-input:hover:not(:has(> .vpg-file-input-list:hover)) {
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

.vpg-file-input-list {
  display: flex;
  flex-direction: column;
  gap: var(--vpg-space-2);
  align-self: stretch;
  margin: 0;
  padding: 0;
  list-style: none;
  text-align: start;
  cursor: default;
}

.vpg-file-input-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  grid-template-areas:
    "name remove"
    "status remove"
    "progress progress";
  align-items: center;
  column-gap: var(--vpg-space-2);
  row-gap: var(--vpg-space-1);
  padding: var(--vpg-space-2) var(--vpg-space-3);
  background-color: var(--vpg-surface-raised);
  border: 1px solid var(--vpg-border);
  border-radius: var(--vpg-radius-sm);
}

.vpg-file-input-row[data-status="failed"],
.vpg-file-input-row[data-status="rejected"] {
  border-inline-start-color: var(--vpg-danger);
  border-inline-start-width: var(--vpg-space-1);
}

.vpg-file-input-name {
  grid-area: name;
  overflow: hidden;
  font-size: var(--vpg-font-size-sm);
  line-height: var(--vpg-line-height-snug);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.vpg-file-input-status {
  grid-area: status;
  font-size: var(--vpg-font-size-xs);
  line-height: var(--vpg-line-height-snug);
  color: var(--vpg-ink-muted);
}

.vpg-file-input-row[data-status="failed"] .vpg-file-input-status,
.vpg-file-input-row[data-status="rejected"] .vpg-file-input-status {
  color: var(--vpg-danger);
}

.vpg-file-input-progress {
  grid-area: progress;
}

.vpg-file-input-remove {
  grid-area: remove;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: content-box;
  width: var(--vpg-icon-md);
  height: var(--vpg-icon-md);
  appearance: none;
  margin: 0;
  padding: var(--vpg-space-1);
  border: none;
  border-radius: var(--vpg-radius-full);
  background: none;
  color: var(--vpg-ink-muted);
  font: inherit;
  cursor: pointer;
  transition: background-color var(--vpg-duration-fast) var(--vpg-ease-standard);
}

.vpg-file-input-remove:hover:not(:disabled) {
  background-color: var(--vpg-surface-hover);
  color: var(--vpg-ink);
}

.vpg-file-input-remove:focus-visible {
  outline: var(--vpg-focus-ring-width) solid var(--vpg-accent-ring);
  outline-offset: var(--vpg-focus-ring-offset);
}

.vpg-file-input-remove:disabled {
  cursor: not-allowed;
}

.vpg-file-input-remove-icon {
  width: 100%;
  height: 100%;
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

/* Keeps the announcements in the accessibility tree while they take no visual space. */
.vpg-file-input-announcer {
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
