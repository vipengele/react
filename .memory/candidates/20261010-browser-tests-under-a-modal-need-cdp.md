---
about: under an open modal dialog elementFromPoint skips inert content, so browser tests prove top-layer paint order and reachability through CDP hit-testing and accessibility-tree probes
saw:
  - source/react-ui/packages/ui/src/Toast/useModalSurfaceHost.browser.test.tsx
  - source/react-ui/packages/ui/src/Toast/ToastRegion.browser.test.tsx
---

- `document.elementFromPoint` ignores inert content and returns the dialog's backdrop, so it cannot
  show that a popover paints above a modal. `useModalSurfaceHost.browser.test.tsx:55` uses CDP
  `DOM.getNodeForLocation` with `ignorePointerEventsNone`.
- Reachability is asserted with CDP `Accessibility.getPartialAXTree` (`:90`) looking the node up
  through the iframe's document; the same probe on a page button behind the dialog reports
  `ignored: true`, which is the control that shows the probe can detect inertness.
- Swipe tests drive a real mouse through CDP `Input.dispatchMouseEvent` with a frame offset added
  (the helper pattern from the ContextMenu browser test); `userEvent` has no drag-by-delta.
- The scroll lock's `scrollbar-gutter: stable` narrows the box fixed top-layer elements are placed
  in by about 15px whether or not anything moves, so geometry assertions against a dialog-open
  page compare with an unmoved reference popover rather than a literal viewport edge.
