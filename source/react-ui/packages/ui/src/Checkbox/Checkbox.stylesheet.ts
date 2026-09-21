/**
 * `<Checkbox>`'s own styles, injected as an inline `<style>` rather than a `.css` import so the
 * package can stay `"sideEffects": false` (same approach as `RadioButton.stylesheet.ts`).
 *
 * Every `--vpg-*` property is *read* here through `var()` and never assigned inline by the
 * component: an inline style declaration always wins over a stylesheet rule for the same
 * property on the same element, so an inline theme property would permanently shadow
 * `@vipengele/react-tokens`' dark-mode reassignment and this checkbox would stop adapting to colour
 * mode.
 *
 * The box is a glyph rather than a pointer target — the label row around it is what a pointer
 * aims at — so it takes a step of the icon scale, and the tick inside it is sized as a fraction
 * of that box so the two stay in proportion. Per ADR-0012 the corner takes the inner step of the
 * radius ladder: the box is the innermost thing on a form, never a container others sit in.
 *
 * The three states are told apart by the `::before` glyph alone — unchecked is a transparent
 * glyph at zero opacity, checked is an opaque tick, indeterminate an opaque bar — so each state
 * differs from the other two in `content`, `background-color` and `opacity` together, and none of
 * them is read off the box's own fill.
 */
export const checkboxStylesheet = `
.vpg-checkbox {
  appearance: none;
  -webkit-appearance: none;
  box-sizing: border-box;
  display: inline-grid;
  place-content: center;
  flex: none;
  width: var(--vpg-icon-md);
  height: var(--vpg-icon-md);
  margin: 0;
  padding: 0;
  border: 1px solid var(--vpg-border);
  border-radius: var(--vpg-radius-sm);
  background-color: var(--vpg-surface);
  color: var(--vpg-accent-contrast);
  /* The tick is a character, so its size is the box's, minus the room the border and the glyph's
     own side bearings take. */
  font-size: calc(var(--vpg-icon-md) * 0.7);
  line-height: 1;
  cursor: pointer;
  transition: background-color 120ms ease, border-color 120ms ease;
}

.vpg-checkbox::before {
  content: "";
  display: block;
  background-color: transparent;
  opacity: 0;
  transition: opacity 120ms ease;
}

.vpg-checkbox:checked,
.vpg-checkbox:indeterminate {
  border-color: var(--vpg-accent);
  background-color: var(--vpg-accent);
}

.vpg-checkbox:checked::before {
  content: "✓";
  opacity: 1;
}

.vpg-checkbox:indeterminate::before {
  content: "";
  width: calc(var(--vpg-icon-md) * 0.55);
  /* A stroke, not a space: the bar is drawn to match the hairline border of the box it sits in,
     which is the one literal the spacing ladder has no step for. */
  height: 2px;
  border-radius: var(--vpg-radius-full);
  background-color: var(--vpg-accent-contrast);
  opacity: 1;
}

.vpg-checkbox:focus-visible {
  outline: var(--vpg-focus-ring-width) solid var(--vpg-accent-ring);
  outline-offset: var(--vpg-focus-ring-offset);
}

/* The control dims itself and nothing else: a \`<fieldset disabled>\` around a group propagates
   native disabledness to every control inside it, so each box already arrives disabled, and a row
   that also dimmed its own text would stack that treatment on itself. */
.vpg-checkbox:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.vpg-checkbox-row {
  display: inline-flex;
  align-items: center;
  gap: var(--vpg-space-2);
  cursor: pointer;
}

.vpg-checkbox-label {
  font-family: var(--vpg-font-sans);
  font-size: var(--vpg-font-size-sm);
  line-height: var(--vpg-line-height-snug);
  color: var(--vpg-ink);
}
`;
