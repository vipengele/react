---
name: nested-overlay-escape-needs-dismiss-on-search-input-and-tooltip-bubbling
kind: gotcha
description: A searchable Dropdown inside a Popover needs useDismiss on the search input or Escape closes nothing, and Tooltip must set bubbles.escapeKey so it never swallows its parent's Escape.
anchors:
  - path: source/react-ui/packages/ui/src/internal/useListboxKeyboard.ts
    blob: 43fb480e5e70
  - path: source/react-ui/packages/ui/src/Tooltip/Tooltip.tsx
    blob: 9fd74110850f
  - path: source/react-ui/packages/ui/src/internal/overlayNesting.browser.test.tsx
    blob: 51735dd30f0e
confidence: verified
---

floating-ui's `useDismiss` handles Escape in a React `onKeyDown` as well as a document listener. A
keystroke in the listbox search input propagates through the React tree (portal or not) into the
Popover panel's handler, which sees the listbox as an open child node, stays open and stops the event,
so the listbox's document listener never fires. `useListboxKeyboard.ts:277` therefore composes
`dismiss` into `searchInteractions` (`useInteractions([listboxRole, listNavigation, dismiss])`).

Escape does not bubble by default (innermost overlay only), so an open Tooltip would keep its parent
Popover open: `Tooltip.tsx:80` passes `bubbles: { escapeKey: true }` (doc `:46`). Outside presses keep the
default of bubbling; do not set `bubbles: { outsidePress: false }` on any overlay.
