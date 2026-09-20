/**
 * `<FieldSet>`'s own styles, injected as an inline `<style>` rather than a `.css` import so the
 * package can stay `"sideEffects": false` (same approach as `FormField`'s and `Card`'s
 * stylesheets).
 *
 * Every `--tandiko-*` property is *read* here through `var()` and never assigned inline by the
 * component: an inline style declaration always wins over a stylesheet rule for the same
 * property on the same element, so an inline theme property would permanently shadow
 * `@tandiko/tokens`'s dark-mode reassignment and this fieldset would stop adapting to colour
 * mode.
 *
 * Reads the same raised-surface tokens as `Card` — `--tandiko-surface-raised`,
 * `--tandiko-border` — so a group of fields reads as the same material as a card, rather than as
 * bare unstyled markup. `FieldSet` is an outer container (a field sits inside it, never the other
 * way around), so per ADR-0012 its corner takes the outer step of the radius ladder,
 * `--tandiko-radius-lg`, not the inner step a field itself takes. The legend takes the same
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
 * The fieldset itself stays a plain block box (not flex) so the browser's own
 * `max(padding-top, legend-block-size)` rule is the only thing sizing the gap above the first
 * child; a flex `gap` would additionally count the legend as a flex item and double that space.
 * The gap between the remaining children comes from a sibling-combinator margin instead of `gap`,
 * since `gap` cannot skip the pair the legend is one half of.
 */
export const fieldSetStylesheet = `
.tandiko-fieldset {
  box-sizing: border-box;
  margin: 0;
  padding: var(--tandiko-space-5);
  background-color: var(--tandiko-surface-raised);
  border: 1px solid var(--tandiko-border);
  border-radius: var(--tandiko-radius-lg);
}

.tandiko-fieldset:disabled {
  opacity: 0.55;
}

.tandiko-fieldset > *:not(.tandiko-fieldset-legend) ~ *:not(.tandiko-fieldset-legend) {
  margin-top: var(--tandiko-space-5);
}

.tandiko-fieldset-legend {
  padding: 0;
  margin: 0;
  font-size: var(--tandiko-font-size-sm);
  font-weight: 600;
  color: var(--tandiko-ink);
}
`;
