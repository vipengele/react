/**
 * `<FieldShell>`'s own styles — the bordered box a text-entry control composes, its two adornment
 * slots, and the states it reads out of the control it wraps.
 *
 * Injected as an inline `<style>` rather than a `.css` import so the package can stay
 * `"sideEffects": false` (same approach as `TextField`'s and `Dropdown`'s stylesheets).
 *
 * Every `--vpg-*` property is *read* here through `var()` and never assigned inline by the
 * component: an inline style declaration always wins over a stylesheet rule for the same property
 * on the same element, so an inline `--vpg-surface` would permanently shadow the dark-mode
 * reassignment in `@vipengele/react-tokens`'s base stylesheet and the shell would stop adapting to colour
 * mode.
 *
 * Every measurement is a scale step: the minimum height is the size scale's default control step,
 * the horizontal padding and the gap between the slots and the centre are spacing steps, and the
 * corner is the radius ladder's inner step, which is the step a field takes (ADR-0012). A literal
 * here is one more measurement agreeing with nothing, which is the drift `FieldShell` exists to
 * end (ADR-0011).
 *
 * The step is a floor rather than a fixed height: a single-line control sits at exactly the step,
 * and a centre that wraps onto a second line — a row of chips beside a trigger — grows the box
 * instead of overflowing it.
 *
 * The state rules match `> ` — a direct child of the shell — so each reads the wrapped control and
 * nothing deeper. An adornment slot holds an arbitrary subtree that can carry its own interactive
 * elements, a reveal or clear button among them, and an unscoped `:has(:disabled)`,
 * `:has([aria-invalid="true"])` or `:has([aria-expanded="true"])` treats one of those as the
 * field's own state: the whole field dims because a button beside the control is off, or takes the
 * accent border because a menu beside the control is open.
 */
export const fieldShellStylesheet = `
.vpg-field-shell {
  display: flex;
  align-items: center;
  gap: var(--vpg-space-2);
  box-sizing: border-box;
  width: 100%;
  min-height: var(--vpg-size-md);
  padding: 0 var(--vpg-space-3);
  background-color: var(--vpg-surface);
  border: 1px solid var(--vpg-border-strong);
  border-radius: var(--vpg-radius-sm);
  color: var(--vpg-ink);
  transition: border-color var(--vpg-duration-fast) var(--vpg-ease-standard),
    box-shadow var(--vpg-duration-fast) var(--vpg-ease-standard),
    opacity var(--vpg-duration-fast) var(--vpg-ease-standard),
    background-color var(--vpg-duration-fast) var(--vpg-ease-standard);
}

/* The centre is whatever the caller passes as children — one control, or a pair of siblings such
   as a chip row beside a trigger. \`min-width: 0\` is what stops a flex item propagating its
   content's intrinsic width, so a wide centre shrinks inside the field rather than growing the
   field past what contains it. */
.vpg-field-shell > *:not(.vpg-field-shell-leading, .vpg-field-shell-trailing) {
  flex: 0 1 auto;
  min-width: 0;
}

/* The centre's free space goes to one element, and only to one. A centre of several — a chip row,
   then a trigger — sizes every earlier element to its content and leaves the remainder to the
   trigger, where the caret goes; splitting the space evenly instead would stretch the chip row to
   half the field whatever it holds.

   Which element gets it is chosen two ways. A composer that marks its control
   \`.vpg-field-shell-control\` names it outright, and the marker travels with the control: a page
   injecting an element into the shell — a password manager appending its own custom element — can
   land anywhere among the children without taking the space, because nothing about the rule reads
   position.

   An unmarked shell falls back to position, the last centre element. That fallback is what an
   injected element captures, leaving the control at its intrinsic width and a trailing slot
   floating beside the text rather than flush right. \`of\` counts among the centre elements only,
   so it finds the last one whether or not a trailing slot follows it.

   The \`:not(:has())\` guard is what keeps the two from ever both applying: the fallback matches
   only in a shell with no marked control, so no shell has two elements at \`flex: 1\` and the
   outcome never depends on which rule the cascade happens to prefer. */
.vpg-field-shell > .vpg-field-shell-control {
  flex: 1;
}

.vpg-field-shell:not(:has(> .vpg-field-shell-control))
  > *:nth-last-child(1 of :not(.vpg-field-shell-leading, .vpg-field-shell-trailing)) {
  flex: 1;
}

.vpg-field-shell-leading,
.vpg-field-shell-trailing {
  display: flex;
  align-items: center;
  flex: none;
  color: var(--vpg-ink-muted);
}

.vpg-field-shell:has(> :focus-visible) {
  border-color: var(--vpg-accent);
  box-shadow: 0 0 0 var(--vpg-focus-ring-width) var(--vpg-accent-ring);
}

/* The field whose control has its listbox open takes the accent border, so a pointer-opened
   combobox — which \`:focus-visible\` does not match — still reads as the field the listbox belongs
   to. Border only: the ring is keyboard focus's, and an open listbox does not claim it. The
   \`:not()\` hands an invalid field to the danger border outright, so which of the two wins never
   depends on the order these rules sit in or on the order stylesheets are injected. */
.vpg-field-shell:has(> [aria-expanded="true"]):not(:has(> [aria-invalid="true"])) {
  border-color: var(--vpg-accent);
}

.vpg-field-shell:has(> [aria-invalid="true"]) {
  border-color: var(--vpg-danger);
}

.vpg-field-shell:has(> [aria-invalid="true"]):has(> :focus-visible) {
  box-shadow: 0 0 0 var(--vpg-focus-ring-width) var(--vpg-danger-ring);
}

.vpg-field-shell:has(> :disabled) {
  cursor: not-allowed;
  opacity: 0.55;
}

.vpg-field-shell:hover:not(:has(> :disabled)) {
  background-color: var(--vpg-surface-hover);
}
`;
