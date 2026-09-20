/**
 * `<RadioGroup>`'s own styles, injected as an inline `<style>` rather than a `.css` import so the
 * package can stay `"sideEffects": false` (same approach as `Toggle`'s and `Tabs`' stylesheets).
 *
 * Every `--vpg-*` property is *read* here through `var()` and never assigned inline by the
 * component: an inline style declaration always wins over a stylesheet rule for the same property
 * on the same element, so an inline theme property would permanently shadow
 * `@vipengele/react-tokens`' dark-mode reassignment and this group would stop adapting to colour mode.
 */
export const radioGroupStylesheet = `
.vpg-radio-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
`;
