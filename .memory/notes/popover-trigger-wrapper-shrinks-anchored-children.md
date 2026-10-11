---
name: popover-trigger-wrapper-shrinks-anchored-children
kind: gotcha
description: Popover's trigger wrapper is inline-flex and carries the floating-ui reference, so a full-width child and the panel anchor collapse to the child's intrinsic width unless the wrapper is restyled.
anchors:
  - path: source/react-ui/packages/ui/src/Popover/Popover.stylesheet.ts
    blob: 0edbbd2c5f1b
  - path: source/react-ui/packages/ui/src/SideNav/SideNav.stylesheet.ts
    blob: 2470549cc7c9
  - path: source/react-ui/packages/ui/src/SideNav/SideNav.browser.test.tsx
    blob: aa1f6ea0e459
confidence: verified
---

`Popover.stylesheet.ts:25` sets the trigger wrapper to `display: inline-flex`. It is the floating-ui reference,
so the panel anchors to the wrapper's box. In the SideNav rail that made the section button 16px wide and
opened the flyout inside the 48px rail; `SideNav.stylesheet.ts` overrides
`.vpg-side-nav-section-rail > .vpg-popover-trigger` with `display: flex; flex-direction: column` (plain
`flex` fixes the flyout position but not the button width). The override uses two classes because the nav
stylesheet is injected before Popover's single-class rule. Tooltip's trigger wraps its child in a span too.
