/**
 * `<TopNav>`'s own styles, injected as an inline `<style>` rather than a `.css` import so the
 * package can stay `"sideEffects": false` (same approach as `SideNav`'s and `Tabs`' stylesheets).
 *
 * Every `--vpg-*` property is *read* here through `var()` and never assigned inline by the
 * component: an inline style declaration always wins over a stylesheet rule for the same property
 * on the same element, so an inline `--vpg-accent-wash` would permanently shadow the dark-mode
 * reassignment in `@vipengele/react-tokens`'s base stylesheet and the nav would stop adapting to
 * colour mode.
 *
 * The row of links is an `Inline`, which owns its flex layout and the gap, alignment and wrapping
 * it is given; the rules here add only what the nav needs on top of it. The rule that restyles the
 * composed `Menu` trigger wrapper carries one more class than that component's own rule: the nav's
 * stylesheet is injected before theirs, so at equal specificity theirs would win.
 */
export const topNavStylesheet = `
.vpg-top-nav {
  display: flex;
  align-items: center;
  gap: var(--vpg-space-4);
  box-sizing: border-box;
  padding-block: var(--vpg-space-2);
  padding-inline: var(--vpg-space-4);
  background-color: var(--vpg-surface);
  border-block-end: 1px solid var(--vpg-border);
  color: var(--vpg-ink);
  font-family: var(--vpg-font-sans);
  font-size: var(--vpg-font-size-sm);
  line-height: 1.5;
}

/* The slots keep their own width: only the row between them gives way. */
.vpg-top-nav-start,
.vpg-top-nav-end {
  display: flex;
  flex: none;
  align-items: center;
}

/* The box the row is measured against. It takes the space the slots leave and has no width of its
   own to contribute, so its width does not depend on how many items the row shows. */
.vpg-top-nav-main {
  flex: 1 1 0;
  min-width: 0;
}

.vpg-top-nav-row {
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  margin: 0;
  padding: 0;
  list-style: none;
}

/* The items the row has no width for leave the layout; they stay in the overflow menu. */
.vpg-top-nav-row[data-collapsing] > [data-hidden] {
  display: none;
}

/* The read that decides which items fit needs every one of them on the row at its own width: a
   hidden item has no width to weigh, and a shrunk one reports the row's constraint rather than its
   label. This attribute is set and removed inside one synchronous measurement, so the state it
   describes never paints. */
.vpg-top-nav-row[data-collapsing][data-measuring] > * {
  display: inline-flex;
  flex: none;
}

.vpg-top-nav-link,
.vpg-top-nav-overflow-button {
  appearance: none;
  display: inline-flex;
  align-items: center;
  gap: var(--vpg-space-1);
  box-sizing: border-box;
  min-height: var(--vpg-size-md);
  margin: 0;
  padding-block: var(--vpg-space-1);
  padding-inline: var(--vpg-space-3);
  background: none;
  border: none;
  border-radius: var(--vpg-radius-sm);
  color: var(--vpg-ink-muted);
  font: inherit;
  text-decoration: none;
  white-space: nowrap;
  cursor: pointer;
  transition: background-color var(--vpg-duration-fast) var(--vpg-ease-standard),
    color var(--vpg-duration-fast) var(--vpg-ease-standard);
}

/* An anchor paints itself in the UA link colour once visited. The visited rule sets \`color\`
   directly: a custom property assigned under \`:visited\` is discarded. */
.vpg-top-nav-link:visited {
  color: var(--vpg-ink-muted);
}

.vpg-top-nav-link:hover,
.vpg-top-nav-link:visited:hover,
.vpg-top-nav-overflow-button:hover {
  background-color: var(--vpg-surface-hover);
  color: var(--vpg-ink);
  text-decoration: none;
}

.vpg-top-nav-link:focus-visible,
.vpg-top-nav-overflow-button:focus-visible {
  outline: var(--vpg-focus-ring-width) solid var(--vpg-accent-ring);
  outline-offset: var(--vpg-focus-ring-offset);
}

/* The current page reads on the background and the text colour together, so it survives in a
   rendering that drops either one. */
.vpg-top-nav-link[aria-current="page"],
.vpg-top-nav-link[aria-current="page"]:visited {
  background-color: var(--vpg-accent-wash);
  color: var(--vpg-accent);
}

/* While the current page is collapsed, the trigger that holds it takes the accent colour and
   weight without the selected background: its own button is never the page. */
.vpg-top-nav-overflow-button-current {
  color: var(--vpg-accent);
  font-weight: var(--vpg-font-weight-semibold);
}

.vpg-top-nav-overflow-chevron {
  flex: none;
  width: var(--vpg-icon-sm);
  height: var(--vpg-icon-sm);
}

/* The wrapper around the overflow button is inline-flex in the menu's own rule; here it also
   stays as wide as the button, so the measured width of the item is the button's. */
.vpg-top-nav-overflow .vpg-menu-trigger {
  display: inline-flex;
  flex: none;
}
`;
