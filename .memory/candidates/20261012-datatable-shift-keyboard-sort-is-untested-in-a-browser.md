---
about: DataTable's keyboard Shift fallback is exercised in Chromium for row selection, but Shift+Enter and Shift+Space on the sort headers have only jsdom stand-in tests
saw:
  - source/react-ui/packages/ui/src/DataTable/DataTable.tsx
  - source/react-ui/packages/ui/src/DataTable/DataTable.test.tsx
  - source/react-ui/packages/ui/src/DataTable/DataTable.browser.test.tsx
  - source/react-ui/packages/ui/package.json
---
`DataTable.tsx` decides whether a header activation is additive in one `onClick`: `event.shiftKey`, or a click with
`detail === 0` (one the keyboard triggered) when the preceding Enter or Space keydown recorded Shift in `keyShiftRef`.
The ref is cleared on every click, so Shift cannot leak into a later pointer click.

- Sorting: `DataTable.test.tsx` drives it with `fireEvent` (keyDown, then `click({detail: 0})`), which proves the
  fallback logic, not that a real browser's keyboard-activated click carries Shift. No browser test activates a sort
  header with Shift held.
- Selection: `DataTable.browser.test.tsx` runs Shift+Space and Shift-click on the row controls in headless Chromium, using
  `userEvent` from `vitest/browser` (not `@testing-library/user-event`, which `packages/ui` does not depend on). The
  selection path uses the same record-Shift-on-keydown idea, so that file is where a sort-header Shift test would go.
- jsdom tests in `packages/ui` use `fireEvent` throughout; the Chromium project is the only place a real
  keyboard-activated click is observable, and it cannot run in the cloud sandbox.
