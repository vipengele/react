/**
 * `<Button>`'s own styles, injected as an inline `<style>` rather than a `.css` import so the
 * package can stay `"sideEffects": false` (same approach as `@vipengele/react-tokens`'s base stylesheet
 * and `@vipengele/react-icons`'s icon stylesheet).
 *
 * Every `--vpg-*` property is *read* here through `var()` and never assigned inline by the
 * component: an inline style declaration always wins over a stylesheet rule for the same
 * property on the same element, so an inline `--vpg-accent` would permanently shadow the
 * dark-mode reassignment in `@vipengele/react-tokens`'s base stylesheet and this button would stop
 * adapting to colour mode.
 *
 * Heights come from the size scale, paddings from the spacing scale and label sizes from the
 * type scale. The danger variant reads the `--vpg-danger` ramp, which is derived exactly as the
 * accent ramp is, so both variants shift by the same amount on hover and press.
 */
export const buttonStylesheet = `
.vpg-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--vpg-space-2);
  box-sizing: border-box;
  border: 1px solid transparent;
  border-radius: var(--vpg-radius);
  font-family: inherit;
  font-weight: 500;
  line-height: 1;
  white-space: nowrap;
  text-decoration: none;
  cursor: pointer;
  /* Colour and background come from the variant rules below; every variant animates the same
     two properties, so the transition belongs here rather than four times over. */
  transition: background-color 120ms ease, border-color 120ms ease, color 120ms ease;
}

.vpg-button:focus-visible {
  /* Offset rather than inset so the ring stays legible against a same-coloured surface. */
  outline: var(--vpg-focus-ring-width) solid var(--vpg-accent-ring);
  outline-offset: var(--vpg-focus-ring-offset);
}

.vpg-button:disabled {
  /* Pointer events stay on: a disabled button that swallows them gives no cursor feedback and
     no tooltip target. \`cursor\` is what communicates the state. */
  cursor: not-allowed;
  opacity: 0.55;
}

.vpg-button-primary {
  background-color: var(--vpg-accent);
  color: var(--vpg-accent-contrast);
}

.vpg-button-primary:hover:not(:disabled) {
  background-color: var(--vpg-accent-hover);
}

.vpg-button-primary:active:not(:disabled) {
  background-color: var(--vpg-accent-press);
}

.vpg-button-secondary {
  background-color: var(--vpg-surface-raised);
  border-color: var(--vpg-border);
  color: var(--vpg-ink);
}

.vpg-button-secondary:hover:not(:disabled) {
  background-color: var(--vpg-surface-hover);
  border-color: var(--vpg-border-strong);
}

.vpg-button-secondary:active:not(:disabled) {
  background-color: var(--vpg-surface-press);
}

.vpg-button-ghost {
  background-color: transparent;
  color: var(--vpg-ink);
}

.vpg-button-ghost:hover:not(:disabled) {
  background-color: var(--vpg-accent-wash);
}

.vpg-button-ghost:active:not(:disabled) {
  background-color: var(--vpg-surface-press);
}

.vpg-button-danger {
  background-color: var(--vpg-danger);
  color: var(--vpg-danger-contrast);
}

.vpg-button-danger:hover:not(:disabled) {
  background-color: var(--vpg-danger-hover);
}

.vpg-button-danger:active:not(:disabled) {
  background-color: var(--vpg-danger-press);
}

.vpg-button-sm {
  min-height: var(--vpg-size-sm);
  padding: 0 var(--vpg-space-3);
  font-size: var(--vpg-font-size-xs);
}

.vpg-button-md {
  min-height: var(--vpg-size-md);
  padding: 0 var(--vpg-space-4);
  font-size: var(--vpg-font-size-sm);
}

.vpg-button-lg {
  min-height: var(--vpg-size-xl);
  padding: 0 var(--vpg-space-5);
  font-size: var(--vpg-font-size-md);
}

/* Square: the horizontal padding is dropped and the min-height doubles as a width floor, so the
   button stays square at every size without a second per-size scale. */
.vpg-button-icon-only {
  padding: 0;
  aspect-ratio: 1;
}

.vpg-button-icon-only.vpg-button-sm {
  min-width: var(--vpg-size-sm);
}

.vpg-button-icon-only.vpg-button-md {
  min-width: var(--vpg-size-md);
}

.vpg-button-icon-only.vpg-button-lg {
  min-width: var(--vpg-size-xl);
}

.vpg-button-icon {
  flex: none;
  width: 1em;
  height: 1em;
}

/* Keeps the button's accessible name intact while \`loading\` swaps its visible content for a
   spinner: the label stays in the accessibility tree, but takes up no visual space. */
.vpg-button-visually-hidden {
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
