---
about: how DateField gets focus to the right place after a pick versus Escape in both calendar hosts, and why the Dialog host mounts Calendar one commit late
saw:
  - source/react-ui/packages/ui/src/DateField/DateField.tsx
  - source/react-ui/packages/ui/src/Popover/Popover.tsx
  - source/react-ui/packages/ui/src/Dialog/Dialog.tsx
  - source/react-ui/packages/ui/src/DateField/DateField.browser.test.tsx
---
Learned while building DateField's calendar pop-up; each claim is pinned by a Chromium test that fails when the mechanism is removed.

- `Popover` reads its `returnFocus` ref (`Popover.tsx:59`, forwarded at `:182` as `returnFocus ?? true`) when the panel closes, in
  floating-ui's passive cleanup. DateField points the ref at the calendar button on open and repoints it at the text input in `closeOnto`
  (`DateField.tsx:308`) just before closing from a pick, so Escape and outside press return to the button while a pick returns to the input.
  Repointing after the close request is too late.
- A native `<dialog>` restores focus to the previously focused element on its own, which would win over any ref. `useDialogHost`
  (`DateField.tsx:265`) is an effect in DateField itself: React runs a parent's effects after its children's, so it runs after `Dialog`'s own
  effect has called `close()`, and it then focuses `returnFocus.current`. That is ordering, not a timer.
- `showModal()` focuses the dialog's first focusable element (the previous-month button), and nothing inside a closed `<dialog>` can take
  focus, so `Calendar`'s `autoFocus` cannot act on mount. `dialogReady` (`DateField.tsx:297`, used at `:375`) holds the calendar back until the
  commit after `showModal()` has run; without it the grid day never gets focus.
- The effect that aims `returnFocus` at the button also re-runs when the host flips between narrow and wide, because a flip mounts a new
  button element.
