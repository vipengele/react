---
about: Menu keeps aria-disabled rows as focus stops only because useListNavigation gets disabledIndices [] (floating-ui otherwise skips every aria-disabled row), and it opens on a row only because the focus manager's initial focus is the panel plus focusItemOnOpen
saw:
  - source/react-ui/packages/ui/src/Menu/Menu.tsx
  - source/react-ui/packages/ui/src/Menu/Menu.test.tsx
  - source/react-ui/packages/ui/src/Menu/Menu.browser.test.tsx
---
- `MenuInner` passes `disabledIndices: []` to `useListNavigation`. Left unset, floating-ui treats a
  row carrying `aria-disabled` as unreachable, so arrow keys and typeahead would jump over disabled
  rows; the Menu contract is that they remain stops but are inert. Removing the empty list makes the
  disabled-row navigation tests fail.
- `FloatingFocusManager` gets `initialFocus={refs.floating}` and `useListNavigation` gets
  `focusItemOnOpen: true`: the panel takes focus first, then navigation moves it to the first row
  (ArrowDown, Enter, Space, click, `defaultOpen`) or the last (ArrowUp). A menu with no rows keeps
  focus on the panel.
- Space while a typeahead string is being typed extends the string instead of activating the row
  (`isTyping` from `useTypeahead`'s `onTypingChange`), so a label with a space can be typed in full.
