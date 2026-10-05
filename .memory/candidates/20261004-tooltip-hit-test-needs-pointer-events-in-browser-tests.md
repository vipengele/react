---
about: document.elementFromPoint skips the Tooltip bubble because it takes no pointer events, so a paint-order browser test must opt it into hit testing; a modal Popover also hides outside content from getByRole
saw:
  - source/react-ui/packages/ui/src/internal/overlayNesting.browser.test.tsx
  - source/react-ui/packages/ui/src/Tooltip/Tooltip.stylesheet.ts
  - source/react-ui/packages/ui/src/Popover/Popover.tsx
---
The tooltip bubble has `pointer-events: none` (`Tooltip.stylesheet.ts`), and `elementFromPoint`
skips elements that take no pointer events, so it reports whatever lies beneath whatever the
stacking. `overlayNesting.browser.test.tsx` sets `pointer-events: auto` on the bubble inline before
the hit test; paint order is unchanged and becomes observable.

`Popover` wraps its panel in `FloatingFocusManager modal`, which hides everything outside the panel
from the accessibility tree, so `getByRole("button", { name: "Outside" })` finds nothing while a
popover is open; find that element by text. The chromium Vitest project has no setup file, so every
browser test file needs `afterEach(cleanup)`.
