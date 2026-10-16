---
about: Popover's panel sits at its offset parent's origin on the render that mounts it, so content that focuses or scrolls itself on mount scrolls the page unless the panel is fixed at the viewport for that render
saw:
  - source/react-ui/packages/ui/src/Popover/Popover.tsx
  - source/react-ui/packages/ui/src/Popover/Popover.browser.test.tsx
  - source/react-ui/packages/ui/src/Calendar/useCalendarFocus.ts
  - source/react-ui/packages/ui/src/TimePanel/TimePanel.tsx
---
`refs.setFloating` in `@vipengele/react-dom` is a state setter, so floating-ui holds the panel element one render after the panel mounts. Until
then `floatingStyles` is `position: absolute; top: 0; left: 0`, the origin of the offset parent, which is off screen on a scrolled page. Content
whose mount effects focus or scroll into view runs in that window: `Calendar`'s one-shot `autoFocus` `.focus()` on the day cell
(`useCalendarFocus.ts` layout effect) moved `window.scrollY` from 1216 to 0 in the Chromium test. `Popover.tsx` therefore styles the panel with
`UNMEASURED_STYLE` (`position: fixed; top: 0; left: 0`) while `elements.floating === null`, then switches to `floatingStyles`; floating-ui never
measures the panel while it is fixed. `visibility: hidden` instead would break `autoFocus`, which is one-shot, and mounting the content only once
positioned would break synchronous `fireEvent` tests in SideNav, DateField and DateTimeField. `FloatingFocusManager`'s own initial focus is not
involved: it defers past positioning. jsdom has no layout, so only the Chromium regression test in `Popover.browser.test.tsx` and
`DateTimeField.browser.test.tsx` shows it. A standalone `TimePanel` mounted below the fold still scrolls the page, because its mount effect uses
`scrollIntoView({block: "nearest"})`, which scrolls ancestors.
