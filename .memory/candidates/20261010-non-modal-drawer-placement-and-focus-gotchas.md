---
about: A non-modal Drawer has no trigger, so its outside-press and portal-target behaviour differ from Popover's, and its fixed positioning depends on the surface it is portaled into
saw:
  - source/react-ui/packages/ui/src/Drawer/Drawer.tsx
  - source/react-ui/packages/ui/src/internal/useOverlayState.ts
  - source/react-ui/packages/ui/src/internal/useModalDialog.ts
  - source/react-ui/packages/ui/src/Drawer/Drawer.browser.test.tsx
---

Checked 2026-10-10. Evidence is reading and the Chromium tests, not inference.

- Portal target: `useOverlayRoot` resolves from a reference element. `NonModalDrawer` passes an inline
  `<span hidden>` sentinel held in state, and renders nothing until the sentinel has mounted, so the
  drawer never renders once in the wrong place. With no `.vpg-root` ancestor it renders inline.
- Outside press: floating-ui exempts the reference element from an outside press, and the Drawer has
  none, so a consumer's own toggle button counts as outside. With `closeOnOutsideClick` on, that button
  dismisses via `onOpenChange(false)` and its own handler reopens in the same tick. There is no
  exclusion API.
- `useModalDialog` registers its `<dialog>` through `floatingRef` from an effect. Without it, a press
  inside a modal Dialog or Drawer opened from a non-modal drawer counts as outside the drawer, closes
  it, and unmounts the dialog with it. `refs.setFloating` is not passed as a JSX ref because `setRef`
  is a new function each render and would detach and reattach every time.
- Placement: the drawer is `position: fixed`. Portaled into a Dialog's `<dialog>` it is
  viewport-relative only once the dialog's entry transform has finished; mid-transition it is laid out
  against the dialog. `Drawer.browser.test.tsx` waits for the dialog to settle before measuring.
- Focus return on close only happens if focus is still inside the drawer or on `body` and the
  previous element is still connected, so a docked panel does not steal focus back from the page.
