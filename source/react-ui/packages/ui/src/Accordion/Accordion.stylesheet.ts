/**
 * `<Accordion>`'s own styles, injected as an inline `<style>` rather than a `.css` import so the
 * package can stay `"sideEffects": false` (same approach as `Disclosure`'s and `Tabs`'
 * stylesheets).
 *
 * The accordion is only a wrapper: each item is a `Disclosure`, which brings its own stylesheet
 * for the trigger, the heading and the panel. This one adds the rule lines that separate the
 * items, read from the `--vpg-border` role token and never assigned inline by the component — an
 * inline declaration beats the dark-mode reassignment in `@vipengele/react-tokens`'s base
 * stylesheet, so the dividers would stop adapting to colour mode.
 *
 * A line sits only between two adjacent items, never above the first or below the last, so the
 * accordion takes no frame of its own. The rule uses child combinators, so a disclosure nested
 * inside an item's panel draws no line.
 */
export const accordionStylesheet = `
.vpg-accordion {
  display: flex;
  flex-direction: column;
}

.vpg-accordion > .vpg-disclosure + .vpg-disclosure {
  border-top: 1px solid var(--vpg-border);
}
`;
