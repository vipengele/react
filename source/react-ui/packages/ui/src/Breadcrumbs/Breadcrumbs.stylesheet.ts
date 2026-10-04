/**
 * `<Breadcrumbs>`' own styles, injected as an inline `<style>` rather than a `.css` import so the
 * package can stay `"sideEffects": false`. The links in the trail are `Link`s, which inject and
 * own their own colour and interaction states; this styles only the trail around them.
 *
 * Every `--vpg-*` property is *read* here through `var()` and never assigned inline by the
 * component: an inline custom property would shadow the dark-mode reassignment in
 * `@vipengele/react-tokens`'s base stylesheet and the trail would stop adapting to colour mode.
 *
 * No `font-*` or `line-height` is set: the trail inherits the typography of wherever it sits,
 * as `Link` does.
 *
 * The separator is a pseudo-element on every item after the first, so a one-item trail has none
 * and no separator ever reaches the DOM. Its `content` uses the alt-text form with an empty
 * alternative, so the glyph is drawn but never announced as part of the trail.
 */
export const breadcrumbsStylesheet = `
.vpg-breadcrumbs {
  display: block;
}

.vpg-breadcrumbs-list {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--vpg-space-2);
  margin: 0;
  padding: 0;
  list-style: none;
  border-radius: var(--vpg-radius-sm);
}

.vpg-breadcrumbs-list:focus {
  outline: none;
}

.vpg-breadcrumbs-list:focus-visible {
  outline: var(--vpg-focus-ring-width) solid var(--vpg-accent-ring);
  outline-offset: var(--vpg-focus-ring-offset);
}

.vpg-breadcrumbs-item {
  display: inline-flex;
  align-items: center;
  gap: var(--vpg-space-2);
  color: var(--vpg-ink-muted);
}

.vpg-breadcrumbs-item + .vpg-breadcrumbs-item::before {
  content: "/" / "";
  color: var(--vpg-ink-subtle);
}

.vpg-breadcrumbs-current {
  color: var(--vpg-ink);
}

.vpg-breadcrumbs-expand {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  appearance: none;
  margin: 0;
  padding: 0 var(--vpg-space-1);
  border: none;
  border-radius: var(--vpg-radius-sm);
  background: none;
  color: inherit;
  font: inherit;
  line-height: inherit;
  cursor: pointer;
  transition: background-color var(--vpg-duration-fast) var(--vpg-ease-standard),
    color var(--vpg-duration-fast) var(--vpg-ease-standard);
}

.vpg-breadcrumbs-expand:hover {
  background-color: var(--vpg-surface-hover);
  color: var(--vpg-ink);
}

.vpg-breadcrumbs-expand:focus-visible {
  outline: var(--vpg-focus-ring-width) solid var(--vpg-accent-ring);
  outline-offset: var(--vpg-focus-ring-offset);
}
`;
