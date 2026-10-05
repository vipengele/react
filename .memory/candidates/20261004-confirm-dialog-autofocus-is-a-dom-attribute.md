---
about: ConfirmDialog sets the DOM autofocus attribute in a layout effect because React's autoFocus prop cannot focus inside a Dialog that opens in an effect
saw:
  - source/react-ui/packages/ui/src/ConfirmDialog/ConfirmDialog.tsx
  - source/react-ui/packages/ui/src/ConfirmDialog/ConfirmDialog.browser.test.tsx
  - source/react-ui/packages/ui/src/Dialog/Dialog.tsx
---

Read, not inferred.

- `Dialog` opens its `<dialog>` with `showModal()` from an effect (`Dialog.tsx` open effect), after
  children have mounted. React's `autoFocus` prop calls `focus()` once at mount, while the
  `<dialog>` is still closed, so it never moves focus; it also never renders the `autofocus`
  attribute that `showModal()`'s focusing steps read.
- `ConfirmDialog` therefore toggles the `autofocus` attribute directly on the Cancel (danger tone)
  or Confirm button in a `useLayoutEffect` keyed on `tone`, which runs before Dialog's passive open
  effect (`ConfirmDialog.tsx`). The attribute is also what restores focus when a second `Escape`
  makes the browser force-close the dialog and Dialog re-calls `showModal()`.
- The behaviour is only observable in real Chromium (`ConfirmDialog.browser.test.tsx`); jsdom stubs
  `showModal` and has no focusing steps.
