/**
 * `<FieldShell>`'s own styles — the bordered box a text-entry control composes, its two adornment
 * slots, and the states it reads out of the control it wraps.
 *
 * Injected as an inline `<style>` rather than a `.css` import so the package can stay
 * `"sideEffects": false` (same approach as `TextField`'s and `Dropdown`'s stylesheets).
 *
 * Every `--tandiko-*` property is *read* here through `var()` and never assigned inline by the
 * component: an inline style declaration always wins over a stylesheet rule for the same property
 * on the same element, so an inline `--tandiko-surface` would permanently shadow the dark-mode
 * reassignment in `@tandiko/tokens`'s base stylesheet and the shell would stop adapting to colour
 * mode.
 *
 * Every measurement is a scale step: the height is the size scale's default control step, the
 * horizontal padding and the gap between the slots and the centre are spacing steps, and the
 * corner is the radius ladder's inner step, which is the step a field takes (ADR-0012). A literal
 * here is one more measurement agreeing with nothing, which is the drift `FieldShell` exists to
 * end (ADR-0011).
 *
 * The state rules match `> ` — a direct child of the shell — so each reads the wrapped control and
 * nothing deeper. An adornment slot holds an arbitrary subtree that can carry its own interactive
 * elements, a reveal or clear button among them, and an unscoped `:has(:disabled)` or
 * `:has([aria-invalid="true"])` treats one of those as the field's own state: the whole field dims
 * because a button beside the control is off.
 */
export const fieldShellStylesheet = `
.tandiko-field-shell {
  display: flex;
  align-items: center;
  gap: var(--tandiko-space-2);
  box-sizing: border-box;
  width: 100%;
  height: var(--tandiko-size-md);
  padding: 0 var(--tandiko-space-3);
  background-color: var(--tandiko-surface);
  border: 1px solid var(--tandiko-border-strong);
  border-radius: var(--tandiko-radius-sm);
  color: var(--tandiko-ink);
  transition: border-color var(--tandiko-duration-fast) var(--tandiko-ease-standard),
    box-shadow var(--tandiko-duration-fast) var(--tandiko-ease-standard),
    opacity var(--tandiko-duration-fast) var(--tandiko-ease-standard),
    background-color var(--tandiko-duration-fast) var(--tandiko-ease-standard);
}

/* The centre is whatever the caller passes as children — one control, or a pair of siblings such
   as a chip row beside a trigger. \`min-width: 0\` is what stops a flex item propagating its
   content's intrinsic width, so a wide centre shrinks inside the field rather than growing the
   field past what contains it. */
.tandiko-field-shell > *:not(.tandiko-field-shell-leading, .tandiko-field-shell-trailing) {
  flex: 1;
  min-width: 0;
}

.tandiko-field-shell-leading,
.tandiko-field-shell-trailing {
  display: flex;
  align-items: center;
  flex: none;
  color: var(--tandiko-ink-muted);
}

.tandiko-field-shell:has(> :focus-visible) {
  border-color: var(--tandiko-accent);
  box-shadow: 0 0 0 var(--tandiko-focus-ring-width) var(--tandiko-accent-ring);
}

.tandiko-field-shell:has(> [aria-invalid="true"]) {
  border-color: var(--tandiko-danger);
}

.tandiko-field-shell:has(> [aria-invalid="true"]):has(> :focus-visible) {
  box-shadow: 0 0 0 var(--tandiko-focus-ring-width) var(--tandiko-danger-ring);
}

.tandiko-field-shell:has(> :disabled) {
  cursor: not-allowed;
  opacity: 0.55;
}

.tandiko-field-shell:hover:not(:has(> :disabled)) {
  background-color: var(--tandiko-surface-hover);
}
`;
