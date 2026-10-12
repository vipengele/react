---
about: DataTable's Shift+Enter and Shift+Space additive sort rests on a keydown fallback that jsdom cannot confirm, because user-event is not a ui dependency
saw:
  - source/react-ui/packages/ui/src/DataTable/DataTable.tsx
  - source/react-ui/packages/ui/src/DataTable/DataTable.test.tsx
  - source/react-ui/packages/ui/package.json
---
`DataTable.tsx` decides whether a header activation is additive in one `onClick`: `event.shiftKey`, or a click with
`detail === 0` (one the keyboard triggered) when the preceding Enter or Space keydown recorded Shift in `keyShiftRef`.
The ref is cleared on every click, so Shift cannot leak into a later pointer click. The browser's own Enter/Space
activation is kept, so a key press never fires twice.

The jsdom tests send `keyDown` (plus `keyUp` for Space) and then `click({detail: 0})`, which stands in for the browser's
activation and proves the fallback logic, not that a real browser's keyboard-activated click carries Shift. The ui
package does not depend on `@testing-library/user-event`; its tests use `fireEvent` throughout. Confirming the behaviour
needs a Chromium test (`*.browser.test.tsx`), which cannot run in the cloud sandbox, so it is unverified there.
