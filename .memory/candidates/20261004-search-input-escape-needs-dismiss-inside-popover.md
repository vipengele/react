---
about: a searchable Dropdown inside a Popover needs useDismiss on the search input, or Escape typed in the input closes nothing; and Tooltip must set bubbles.escapeKey so it never blocks its parent's Escape
saw:
  - source/react-ui/packages/ui/src/internal/useListboxKeyboard.ts
  - source/react-ui/packages/ui/src/Tooltip/Tooltip.tsx
  - source/react-ui/packages/ui/src/Dropdown/Dropdown.test.tsx
  - source/react-ui/packages/ui/src/internal/overlayNesting.browser.test.tsx
---
Floating-ui's `useDismiss` handles Escape with a React `onKeyDown` on the reference/floating props
as well as a document listener. A keystroke in the listbox's search input propagates through the
React tree, portal or not, into the Popover panel's handler. That handler sees the listbox open as
its child node, keeps the popover open and stops the event, so the listbox's document listener
never fires. `useListboxKeyboard.ts` therefore composes `dismiss` into `searchInteractions`
(`useInteractions([listboxRole, listNavigation, dismiss])`); without it the Dropdown test "Escape
from the search input closes only the listbox" fails.

Escape does not bubble by default (innermost overlay only), so an open Tooltip would swallow the
keystroke and keep its parent Popover open. `Tooltip.tsx` passes `bubbles: { escapeKey: true }`;
outside presses keep the default (they bubble, so a click on the page closes the whole chain).
Do not set `bubbles: { outsidePress: false }` on any overlay.
