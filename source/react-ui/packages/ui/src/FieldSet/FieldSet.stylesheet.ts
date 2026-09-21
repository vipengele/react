/**
 * `<FieldSet>`'s own styles, injected as an inline `<style>` rather than a `.css` import so the
 * package can stay `"sideEffects": false` (same approach as `FormField`'s and `Card`'s
 * stylesheets).
 *
 * Every `--vpg-*` property is *read* here through `var()` and never assigned inline by the
 * component: an inline style declaration always wins over a stylesheet rule for the same
 * property on the same element, so an inline theme property would permanently shadow
 * `@vipengele/react-tokens`'s dark-mode reassignment and this fieldset would stop adapting to colour
 * mode.
 *
 * Reads the same raised-surface tokens as `Card` — `--vpg-surface-raised`,
 * `--vpg-border` — so a group of fields reads as the same material as a card, rather than as
 * bare unstyled markup. `FieldSet` is an outer container (a field sits inside it, never the other
 * way around), so per ADR-0012 its corner takes the outer step of the radius ladder,
 * `--vpg-radius-lg`, not the inner step a field itself takes. The legend takes the same
 * type-scale step as `FormField`'s label.
 *
 * A native `<legend>` inside a bordered `<fieldset>` is not a normal flow child: the browser lifts
 * it out of the box's padding and straddles it across the border-block-start, cutting a notch the
 * border does not paint through. That notch — not the surface, border or radius — is what reads as
 * unstyled browser chrome unless the legend settles into it deliberately: no margin fighting the
 * browser's own placement, and no padding on the legend either — the browser already anchors the
 * rendered legend's inline-start edge at the fieldset's own padding edge, the same edge every
 * child's content starts from, so a legend with `padding: 0` sets its text flush with the labels
 * beneath it. Padding on the legend only pushes its text past that edge, out of line with them.
 * The fieldset itself stays a plain block box (not flex) and the legend stays outside
 * `.vpg-fieldset-body`, so the legend is never a flex item and the browser's own
 * `max(padding-top, legend-block-size)` rule is the only thing sizing the space above the first
 * child; a legend counted as an item would add the column's `gap` on top of that space.
 * Every child goes in the body, whose column `gap` spaces them whatever their own `display` is —
 * a margin between siblings separates nothing when the siblings are inline and share a line.
 */
export const fieldSetStylesheet = `
.vpg-fieldset {
  box-sizing: border-box;
  margin: 0;
  padding: var(--vpg-space-5);
  background-color: var(--vpg-surface-raised);
  border: 1px solid var(--vpg-border);
  border-radius: var(--vpg-radius-lg);
}

.vpg-fieldset:disabled {
  opacity: 0.55;
}

.vpg-fieldset-body {
  display: flex;
  flex-direction: column;
  gap: var(--vpg-space-5);
}

.vpg-fieldset-legend {
  padding: 0;
  margin: 0;
  font-size: var(--vpg-font-size-sm);
  font-weight: 600;
  color: var(--vpg-ink);
}
`;
