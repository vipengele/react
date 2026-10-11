---
name: menu-disabled-rows-need-empty-disabled-indices
kind: gotcha
description: Menu keeps aria-disabled rows as focus stops only because useListNavigation gets disabledIndices [], and it lands on a row because the focus manager's initial focus is the panel plus focusItemOnOpen.
anchors:
  - path: source/react-ui/packages/ui/src/internal/menuPanel.tsx
    blob: a818c18a842f
  - path: source/react-ui/packages/ui/src/Menu/Menu.test.tsx
    blob: 1b056934e1d1
confidence: verified
---

`menuPanel.tsx:64` passes `disabledIndices: []` to `useListNavigation` (explained at `:46`); left unset,
floating-ui treats any `aria-disabled` row as unreachable and arrows/typeahead would skip disabled
rows, contradicting the Menu contract (inert but focusable). Opening: `:144` gives
`FloatingFocusManager` `initialFocus={refs.floating}` and `:63` sets `focusItemOnOpen: true`, so the panel
takes focus first and navigation then moves it to the first row (or last on ArrowUp). Removing the
empty list makes the disabled-row navigation tests in `Menu.test.tsx` fail. Space during an active
typeahead extends the string instead of activating the row.
