/**
 * `<SideNav>`'s own styles, injected as an inline `<style>` rather than a `.css` import so the
 * package can stay `"sideEffects": false` (same approach as `Tabs`' and `Tree`'s stylesheets).
 *
 * Every `--vpg-*` property is *read* here through `var()` and never assigned inline by the
 * component: an inline style declaration always wins over a stylesheet rule for the same property
 * on the same element, so an inline `--vpg-accent-wash` would permanently shadow the dark-mode
 * reassignment in `@vipengele/react-tokens`'s base stylesheet and the nav would stop adapting to
 * colour mode. A row's indentation is the one inline style, a plain `padding-inline-start` that
 * reads the spacing scale.
 *
 * Item, section-trigger and toggle rows share `.vpg-side-nav-row`. The rules that restyle a
 * composed `Disclosure`, `Popover` or `Tooltip` carry at least one more class than that
 * component's own rule: the nav's stylesheet is injected before theirs, so at equal specificity
 * theirs would win.
 */

/** The default `mobileBelow`, and the length the stylesheet's pre-hydration rules are written
 * against: they are correct for this length only, so only it puts the marker on the parts. */
export const DEFAULT_MOBILE_BELOW = "48rem";

export const sideNavStylesheet = `
.vpg-side-nav {
  display: flex;
  flex-direction: column;
  gap: var(--vpg-space-1);
  box-sizing: border-box;
  /* Fills the height of a container that has one, so a toggle pinned to the end of the nav sits at
     the container's bottom edge; in a container with no height of its own it sizes to its rows. */
  height: 100%;
  /* The size of a container, not a step of anything: no scale carries a measurement this large. */
  width: 16rem;
  padding: var(--vpg-space-2);
  overflow-y: auto;
  background-color: var(--vpg-surface);
  border-inline-end: 1px solid var(--vpg-border);
  color: var(--vpg-ink);
  font-family: var(--vpg-font-sans);
  font-size: var(--vpg-font-size-sm);
  line-height: 1.5;
}

/* One control-size row plus the nav's inline padding, measured to the border box: the nav's
   inline-end border comes out of the content box, so a rail row is that border narrower than
   the control size. The width snaps between the two states: there is no transition. */
.vpg-side-nav-collapsed {
  width: calc(var(--vpg-size-md) + 2 * var(--vpg-space-2));
}

/* Inside the drawer the panel carries the surface, the padding, the edge and the scroll, so the nav
   fills it without drawing any of them again. */
.vpg-side-nav-drawer {
  width: auto;
  padding: 0;
  overflow-y: visible;
  background: none;
  border-inline-end: none;
}

.vpg-side-nav-group {
  display: flex;
  flex-direction: column;
  gap: var(--vpg-space-1);
}

/* The tooltip wrapper around a row, which would otherwise shrink it to its content. */
.vpg-tooltip-trigger:has(> .vpg-side-nav-row) {
  display: flex;
}

/* The popover wrapper around a rail section's button. Block-level, it gives the flyout the full
   row to anchor to; as a column, it stretches the tooltip wrapper, and so the button, across
   that row instead of shrinking both to the icon. */
.vpg-side-nav-section-rail > .vpg-popover-trigger {
  display: flex;
  flex-direction: column;
}

.vpg-side-nav-row {
  appearance: none;
  display: flex;
  align-items: center;
  gap: var(--vpg-space-2);
  box-sizing: border-box;
  width: 100%;
  min-height: var(--vpg-size-md);
  margin: 0;
  padding-block: var(--vpg-space-1);
  padding-inline: var(--vpg-space-3);
  background: none;
  border: none;
  border-radius: var(--vpg-radius-sm);
  color: inherit;
  font: inherit;
  text-align: start;
  text-decoration: none;
  cursor: pointer;
  transition: background-color var(--vpg-duration-fast) var(--vpg-ease-standard);
}

.vpg-side-nav-row:hover {
  background-color: var(--vpg-surface-hover);
}

.vpg-side-nav-row:focus-visible {
  /* Inset, so adjacent rows never cover each other's ring. */
  outline: var(--vpg-focus-ring-width) solid var(--vpg-accent-ring);
  outline-offset: calc(var(--vpg-focus-ring-offset) * -1);
}

.vpg-side-nav-row-rail {
  justify-content: center;
  padding-inline: 0;
}

/* The current page reads on the background and the text colour together, so it survives in a
   rendering that drops either one. */
.vpg-side-nav-item[aria-current="page"] {
  background-color: var(--vpg-accent-wash);
  color: var(--vpg-accent);
}

/* A rail section holding the current page: its own button is never the page, so it takes the
   accent colour and weight without the selected background. */
.vpg-side-nav-section-trigger-current {
  color: var(--vpg-accent);
  font-weight: var(--vpg-font-weight-semibold);
}

.vpg-side-nav-icon {
  display: inline-flex;
  flex: none;
  width: var(--vpg-icon-md);
  height: var(--vpg-icon-md);
}

.vpg-side-nav-icon > svg {
  width: 100%;
  height: 100%;
}

.vpg-side-nav-label {
  min-width: 0;
  overflow-wrap: break-word;
}

/* Keeps a rail row's label as its accessible name without taking up visual space. */
.vpg-side-nav-visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.vpg-side-nav-section.vpg-disclosure {
  color: inherit;
}

/* A group's heading is a label, not a row: smaller, muted and not interactive. */
.vpg-side-nav-section-heading {
  padding-block: var(--vpg-space-1);
  padding-inline-end: var(--vpg-space-3);
  color: var(--vpg-ink-muted);
  font-size: var(--vpg-font-size-xs);
  font-weight: var(--vpg-font-weight-semibold);
  line-height: 1.5;
}

.vpg-side-nav-section-group:not(:first-child) {
  margin-block-start: var(--vpg-space-2);
}

/* In the rail the heading is hidden, so a rule separates the group from the rows before it. */
.vpg-side-nav-section-group-rail:not(:first-child) {
  padding-block-start: var(--vpg-space-2);
  border-block-start: 1px solid var(--vpg-border);
}

/* The wrapper around a toggle pinned to the end of the nav. The toggle is the wrapper's only
   child, so the wrapper is the nav's flex item and carries the auto margin. */
.vpg-tooltip-trigger:has(> .vpg-side-nav-collapse-toggle-bottom) {
  margin-block-start: auto;
}

.vpg-side-nav-section > .vpg-disclosure-trigger {
  min-height: var(--vpg-size-md);
  padding-block: var(--vpg-space-1);
  padding-inline: 0 var(--vpg-space-3);
  border-radius: var(--vpg-radius-sm);
  color: var(--vpg-ink-muted);
  font-size: var(--vpg-font-size-xs);
  font-weight: var(--vpg-font-weight-semibold);
  line-height: 1.5;
  transition: background-color var(--vpg-duration-fast) var(--vpg-ease-standard);
}

.vpg-side-nav-section > .vpg-disclosure-trigger:hover:not(:disabled) {
  background-color: var(--vpg-surface-hover);
  color: var(--vpg-ink);
}

.vpg-side-nav-section > .vpg-disclosure-trigger:focus-visible {
  outline-offset: calc(var(--vpg-focus-ring-offset) * -1);
}

.vpg-side-nav-section-label {
  display: flex;
  align-items: center;
  gap: var(--vpg-space-2);
  min-width: 0;
}

.vpg-side-nav-section > .vpg-disclosure-panel > .vpg-disclosure-content {
  padding: var(--vpg-space-1) 0 0;
}

.vpg-popover.vpg-side-nav-flyout {
  /* The size of a container, not a step of anything: no scale carries a measurement this large. */
  min-width: 12rem;
  padding: var(--vpg-space-2);
}

.vpg-side-nav-flyout-label {
  padding: var(--vpg-space-1) var(--vpg-space-3);
  color: var(--vpg-ink-muted);
  font-size: var(--vpg-font-size-xs);
  font-weight: var(--vpg-font-weight-semibold);
}

.vpg-side-nav-mobile-toggle {
  appearance: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  width: var(--vpg-size-md);
  height: var(--vpg-size-md);
  margin: 0;
  padding: 0;
  background: none;
  border: none;
  border-radius: var(--vpg-radius-sm);
  color: var(--vpg-ink);
  cursor: pointer;
  transition: background-color var(--vpg-duration-fast) var(--vpg-ease-standard);
}

.vpg-side-nav-mobile-toggle:hover {
  background-color: var(--vpg-surface-hover);
}

.vpg-side-nav-mobile-toggle:focus-visible {
  outline: var(--vpg-focus-ring-width) solid var(--vpg-accent-ring);
  outline-offset: var(--vpg-focus-ring-offset);
}

/* Until the viewport is known, the nav and the toggle both render with the marker, and these rules
   show exactly one of them on each side of the default mobileBelow, so server HTML is already the
   right presentation before hydration. Once the viewport is known the marker is gone and the
   component renders only the one that applies. Attribute plus class outranks each part's own
   display rule. */
@media (width < ${DEFAULT_MOBILE_BELOW}) {
  .vpg-side-nav[data-vpg-side-nav-unresolved] {
    display: none;
  }
}

@media (width >= ${DEFAULT_MOBILE_BELOW}) {
  .vpg-side-nav-mobile-toggle[data-vpg-side-nav-unresolved] {
    display: none;
  }
}
`;
