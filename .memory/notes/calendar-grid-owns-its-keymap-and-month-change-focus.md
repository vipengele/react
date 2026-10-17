---
name: calendar-grid-owns-its-keymap-and-month-change-focus
kind: rationale
description: Calendar owns its own 2-D keymap because useRovingFocus is 1-D, and re-applies focus in a layout effect after a month change, only when focus was inside the grid; autoFocus is destructured so React does not focus the root.
anchors:
  - path: source/react-ui/packages/ui/src/Calendar/useCalendarFocus.ts
    blob: 440d8dacf5e1
  - path: source/react-ui/packages/ui/src/Calendar/CalendarCore.tsx
    blob: b25a269a6068
  - path: source/react-ui/packages/ui/src/internal/useRovingFocus.ts
    blob: ce44beb4b07e
  - path: source/react-ui/packages/ui/src/Tree/useTreeFocus.ts
    blob: 44dfd9dccfa9
  - path: docs/adr/0044-roving-focus-is-a-keyboard-only-hook-the-caller-owns-the-tab-stop.md
    blob: ba22144b3006
confidence: suspect
---

- `useRovingFocus` is 1-D: one orientation's arrow pair plus Home/End, the off-axis pair "never handled" (its options doc), it
  queries DOM items and writes no tabindex (ADR-0044). It cannot express a 7-column grid (Up/Down = ±7 days, PageUp/PageDown =
  month, Shift = year), so the calendar keymap lives in `useCalendarFocus.ts`.
- Tree (`useTreeFocus.ts`, ADR-0038) is the precedent for model-driven focus: tab stop derived from state, DOM focus moved only when
  focus is within, and a pending-focus ref plus layout effect focuses a target not yet mounted. A month change unmounts the focused
  day button, so `useCalendarFocus.ts` (`useLayoutEffect` at `:109`) re-applies focus after the new month commits, and only when
  focus was inside the grid, or a background `value` update would steal focus.
- `autoFocus` acts once on mount through a ref cleared after use (`useCalendarFocus.ts:98,124-126`). `Calendar.tsx:106` and
  `CalendarCore.tsx:203` destructure it out of the rest props, because React focuses a host element given `autoFocus` on mount,
  which would focus the root rather than the tab-stop day. In a modal `Popover` (`FloatingFocusManager`, no `initialFocus` exposed)
  initial focus would otherwise be the first tabbable, the previous-month button.
- Calendar uses `aria-disabled` rather than `disabled` for month buttons and Clear, so a just-clicked control keeps focus
  (Pagination's native-disabled step buttons lose it, ADR-0043); browser tests then need `{ force: true }`
  ([[aria-disabled-browser-clicks-need-force]]). Calendar handles no Escape: the tree's `useDismiss` owns it.
