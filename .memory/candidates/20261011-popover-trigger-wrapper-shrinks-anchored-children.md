---
about: Popover's trigger wrapper span is inline-flex and shrinks to its content, so a child meant to fill a row, and the floating-ui anchor, collapse to the child's intrinsic width unless the consumer restyles the wrapper
saw:
  - source/react-ui/packages/ui/src/Popover/Popover.stylesheet.ts
  - source/react-ui/packages/ui/src/SideNav/SideNav.stylesheet.ts
  - source/react-ui/packages/ui/src/SideNav/SideNav.browser.test.tsx
---

Found by two failing Chromium tests in `SideNav.browser.test.tsx`.

- `Popover.stylesheet.ts` sets `.vpg-popover-trigger` to `display: inline-flex`. The wrapper carries the floating-ui
  reference, so the panel anchors to the wrapper's box, not to the child's intended row.
- In the SideNav rail the section button was 16px wide (the icon) instead of the rail's full row, and the flyout
  opened at x=34, inside the 48px rail.
- `SideNav.stylesheet.ts` overrides it with `.vpg-side-nav-section-rail > .vpg-popover-trigger { display: flex;
  flex-direction: column; }`. A plain `display: flex` fixes the flyout position but leaves the button 16px wide;
  the column direction stretches the tooltip wrapper, and so the button, across the row.
- The two-class selector is needed because the nav stylesheet is injected before Popover's single-class rule.
- The same wrapper-shrink applies to any consumer that places a full-width control inside `Popover` or `Tooltip`
  (`.vpg-tooltip-trigger` wraps its child in a span too).
