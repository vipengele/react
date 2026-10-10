---
about: Playwright treats aria-disabled="true" as not enabled so userEvent click/hover on such a button needs { force: true }; React bubbles focus out of portals along the component tree so a roving container must check the DOM contains the target; browser tests that hover need an unhover in afterEach
saw:
  - source/react-ui/packages/ui/src/Button/Button.browser.test.tsx
  - source/react-ui/packages/ui/src/Toolbar/Toolbar.tsx
  - source/react-ui/packages/ui/src/Toolbar/Toolbar.browser.test.tsx
  - source/react-ui/packages/ui/src/internal/useRovingFocus.ts
---
Checked 2026-10-10 (react-ui 0.1.x).

- Button.browser.test.tsx: the vitest browser `userEvent.click`/`hover` wait for actionability, and Playwright counts
  `aria-disabled="true"` as not enabled, so the call times out unless given `{ force: true }`. A native-disabled
  button's click is also forced there to prove Chromium delivers it to neither its handler nor a wrapper.
- Button.browser.test.tsx: `afterEach` is `cleanup` followed by `userEvent.unhover(document.body)`; without the
  unhover a hover from one test leaks into the next test's background-colour assertions.
- Toolbar.tsx `handleFocus`: React synthetic `onFocus` bubbles from a portalled control (a MenuButton's popover) to the
  toolbar through the component tree. Recording `event.target` as the last-focused item without
  `event.currentTarget.contains(target)` would make a popover control the tab stop; a Toolbar test pins this.
- useRovingFocus.ts yields only ArrowLeft/Right/Home/End to editable or role slider/spinbutton/combobox/textbox/
  searchbox targets, whatever the orientation; in a vertical group ArrowUp/Down still move off a text field, slider or
  spinbutton (pinned by "still moves off an editable item with the vertical arrows" in useRovingFocus.test.tsx).
