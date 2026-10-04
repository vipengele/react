---
about: in jsdom, fireEvent.click has detail 0 and floating-ui reads it as a keyboard-made click, and a click on a disabled button still bubbles to a wrapper; real Chromium differs on both, so Menu's pointer-open and disabled-MenuButton behaviour are asserted in the browser project
saw:
  - source/react-ui/packages/ui/src/Menu/Menu.test.tsx
  - source/react-ui/packages/ui/src/Menu/Menu.browser.test.tsx
  - source/react-ui/packages/ui/src/Menu/MenuButton.tsx
---
- `fireEvent.click` defaults to `detail: 0`, which `useListNavigation`/`useClick` treat as a click
  produced by the keyboard. A jsdom test of "pointer click opens on the first row" must pass
  `detail: 1`, or it cannot tell `focusItemOnOpen: true` from floating-ui's default `'auto'`.
- A synthetic click on a disabled `<button>` still bubbles to the wrapper `<span>` that carries
  Menu's click handler in jsdom, so a disabled `MenuButton` would open there. In Chromium a disabled
  button delivers no click to the wrapper, so the menu stays shut; `Menu.browser.test.tsx` asserts
  that, and the jsdom test only checks `toBeDisabled()`.
