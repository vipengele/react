/**
 * `<Button>`'s own styles, injected as an inline `<style>` rather than a `.css` import so the
 * package can stay `"sideEffects": false` (same approach as `@tandiko/tokens`'s base stylesheet
 * and `@tandiko/icons`'s icon stylesheet).
 *
 * Every `--tandiko-*` property is *read* here through `var()` and never assigned inline by the
 * component: an inline style declaration always wins over a stylesheet rule for the same
 * property on the same element, so an inline `--tandiko-accent` would permanently shadow the
 * dark-mode reassignment in `@tandiko/tokens`'s base stylesheet and this button would stop
 * adapting to colour mode.
 *
 * Heights come from the size scale, paddings from the spacing scale and label sizes from the
 * type scale. The danger variant reads the `--tandiko-danger` ramp, which is derived exactly as the
 * accent ramp is, so both variants shift by the same amount on hover and press.
 */
export const buttonStylesheet = `
.tandiko-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--tandiko-space-2);
  box-sizing: border-box;
  border: 1px solid transparent;
  border-radius: var(--tandiko-radius);
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

.tandiko-button:focus-visible {
  /* Offset rather than inset so the ring stays legible against a same-coloured surface. */
  outline: var(--tandiko-focus-ring-width) solid var(--tandiko-accent-ring);
  outline-offset: var(--tandiko-focus-ring-offset);
}

.tandiko-button:disabled {
  /* Pointer events stay on: a disabled button that swallows them gives no cursor feedback and
     no tooltip target. \`cursor\` is what communicates the state. */
  cursor: not-allowed;
  opacity: 0.55;
}

.tandiko-button-primary {
  background-color: var(--tandiko-accent);
  color: var(--tandiko-accent-contrast);
}

.tandiko-button-primary:hover:not(:disabled) {
  background-color: var(--tandiko-accent-hover);
}

.tandiko-button-primary:active:not(:disabled) {
  background-color: var(--tandiko-accent-press);
}

.tandiko-button-secondary {
  background-color: var(--tandiko-surface-raised);
  border-color: var(--tandiko-border);
  color: var(--tandiko-ink);
}

.tandiko-button-secondary:hover:not(:disabled) {
  background-color: var(--tandiko-surface-hover);
  border-color: var(--tandiko-border-strong);
}

.tandiko-button-secondary:active:not(:disabled) {
  background-color: var(--tandiko-surface-press);
}

.tandiko-button-ghost {
  background-color: transparent;
  color: var(--tandiko-ink);
}

.tandiko-button-ghost:hover:not(:disabled) {
  background-color: var(--tandiko-accent-wash);
}

.tandiko-button-ghost:active:not(:disabled) {
  background-color: var(--tandiko-surface-press);
}

.tandiko-button-danger {
  background-color: var(--tandiko-danger);
  color: var(--tandiko-danger-contrast);
}

.tandiko-button-danger:hover:not(:disabled) {
  background-color: var(--tandiko-danger-hover);
}

.tandiko-button-danger:active:not(:disabled) {
  background-color: var(--tandiko-danger-press);
}

.tandiko-button-sm {
  min-height: var(--tandiko-size-sm);
  padding: 0 var(--tandiko-space-3);
  font-size: var(--tandiko-font-size-xs);
}

.tandiko-button-md {
  min-height: var(--tandiko-size-md);
  padding: 0 var(--tandiko-space-4);
  font-size: var(--tandiko-font-size-sm);
}

.tandiko-button-lg {
  min-height: var(--tandiko-size-xl);
  padding: 0 var(--tandiko-space-5);
  font-size: var(--tandiko-font-size-md);
}

/* Square: the horizontal padding is dropped and the min-height doubles as a width floor, so the
   button stays square at every size without a second per-size scale. */
.tandiko-button-icon-only {
  padding: 0;
  aspect-ratio: 1;
}

.tandiko-button-icon-only.tandiko-button-sm {
  min-width: var(--tandiko-size-sm);
}

.tandiko-button-icon-only.tandiko-button-md {
  min-width: var(--tandiko-size-md);
}

.tandiko-button-icon-only.tandiko-button-lg {
  min-width: var(--tandiko-size-xl);
}

.tandiko-button-icon {
  flex: none;
  width: 1em;
  height: 1em;
}

/* Keeps the button's accessible name intact while \`loading\` swaps its visible content for a
   spinner: the label stays in the accessibility tree, but takes up no visual space. */
.tandiko-button-visually-hidden {
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
