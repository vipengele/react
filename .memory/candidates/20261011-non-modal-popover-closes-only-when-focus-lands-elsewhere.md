---
about: a non-modal Popover closes on Tab only when focus lands on another element; when nothing follows the panel in the DOM, focus leaves the document and the panel stays open
saw:
  - source/react-ui/packages/ui/src/Popover/Popover.tsx
  - source/react-ui/packages/ui/src/Popover/Popover.browser.test.tsx
  - source/react-ui/packages/ui/src/internal/useOverlayRoot.ts
---

Found writing `Popover.browser.test.tsx` (Chromium).

- `Popover` portals its panel through `useOverlayRoot`, which appends it at the end of the nearest `.vpg-root`;
  it uses no `FloatingPortal`, so floating-ui adds no focus guards around the panel.
- Tab past the last element in a `modal={false}` panel therefore moves focus to whatever follows the panel in the DOM.
  When nothing does (the panel is often the last node in the root), focus leaves the document, the `focusout`
  carries a null `relatedTarget`, and floating-ui's `closeOnFocusOut` closes only when `relatedTarget` is set.
  The panel stays open; `Escape` and an outside press still close it.
- The test pins the supported case, with a button placed after the `ThemeProvider` root. A test with the extra button
  inside the root, right after the trigger, fails: focus goes to `body`.
- The SideNav rail flyout (`SideNav/SideNav.tsx`, `RailSection`) is a non-modal Popover and inherits this.
