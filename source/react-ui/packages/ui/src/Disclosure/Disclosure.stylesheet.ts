/**
 * `<Disclosure>`'s own styles, injected as an inline `<style>` rather than a `.css` import so the
 * package can stay `"sideEffects": false` (same approach as `Tabs`' and `Dialog`'s stylesheets).
 *
 * Every `--vpg-*` property is *read* here through `var()` and never assigned inline by the
 * component: an inline style declaration always wins over a stylesheet rule for the same property
 * on the same element, so an inline `--vpg-ink` would permanently shadow the dark-mode
 * reassignment in `@vipengele/react-tokens`'s base stylesheet and this disclosure would stop
 * adapting to colour mode.
 *
 * The panel carries no padding of its own; the content inside it does. A closed panel is
 * therefore genuinely 0px tall, where padding on the panel would leave a sliver showing.
 *
 * The panel animates its height between 0 and `auto` through `interpolate-size`, and its
 * `content-visibility` through an `allow-discrete` transition, which flips to `visible` at the
 * start of an opening and to `hidden` at the end of a closing — so a closing panel's content
 * stays painted until its height reaches 0. Engines without either feature open and close
 * instantly. The durations come from the theme, whose reduced-motion rule collapses them.
 *
 * The chevron rules use child combinators, so an open disclosure never rotates the chevron of a
 * closed one nested in its panel.
 */
export const disclosureStylesheet = `
.vpg-disclosure {
  color: var(--vpg-ink);
  font-family: var(--vpg-font-sans);
}

.vpg-disclosure-heading {
  margin: 0;
  font: inherit;
}

.vpg-disclosure-trigger {
  appearance: none;
  background: none;
  border: none;
  cursor: pointer;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--vpg-space-2);
  width: 100%;
  padding: var(--vpg-space-2) 0;
  color: inherit;
  font: inherit;
  font-size: var(--vpg-font-size-md);
  font-weight: var(--vpg-font-weight-medium);
  line-height: var(--vpg-line-height-snug);
  text-align: left;
}

.vpg-disclosure-trigger:hover:not(:disabled) {
  color: var(--vpg-accent);
}

.vpg-disclosure-trigger:focus-visible {
  outline: var(--vpg-focus-ring-width) solid var(--vpg-accent-ring);
  outline-offset: var(--vpg-focus-ring-offset);
}

.vpg-disclosure-trigger:disabled {
  cursor: not-allowed;
  color: var(--vpg-ink-subtle);
}

.vpg-disclosure-chevron {
  flex: none;
  width: var(--vpg-icon-md);
  height: var(--vpg-icon-md);
  transition: transform var(--vpg-duration-normal) var(--vpg-ease-standard);
}

.vpg-disclosure-open > .vpg-disclosure-trigger > .vpg-disclosure-chevron,
.vpg-disclosure-open > .vpg-disclosure-heading > .vpg-disclosure-trigger > .vpg-disclosure-chevron {
  transform: rotate(180deg);
}

.vpg-disclosure-panel {
  overflow: clip;
  interpolate-size: allow-keywords;
  height: auto;
  transition:
    height var(--vpg-duration-normal) var(--vpg-ease-standard),
    content-visibility var(--vpg-duration-normal) allow-discrete;
}

.vpg-disclosure-panel[hidden] {
  height: 0;
}

.vpg-disclosure-content {
  padding: var(--vpg-space-1) 0 var(--vpg-space-3);
}
`;
