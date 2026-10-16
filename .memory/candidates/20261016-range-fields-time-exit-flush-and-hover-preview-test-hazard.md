---
about: a TimeField's last-segment commit must be flushed before onExitPast moves focus, and RangeCalendar browser tests are disturbed by a leftover hover cursor
saw:
  - source/react-ui/packages/ui/src/TimeField/useTimeField.ts
  - source/react-ui/packages/ui/src/TimeField/timeFieldKeys.ts
  - source/react-ui/packages/ui/src/TimeRangeField/TimeRangeField.tsx
  - source/react-ui/packages/ui/src/RangeCalendar/RangeCalendar.tsx
  - source/react-ui/packages/ui/src/RangeCalendar/RangeCalendar.browser.test.tsx
---
Found while building the range components (#80).

- `useTimeField`'s `completeSegment` commits the last filled segment and, when the optional `onExitPast` is set, hands focus on to a neighbouring field. The commit is wrapped in `flushSync` (`useTimeField.ts`, `completeSegment`) before `onExitPast("end")` runs: focus leaving blurs the group, and the blur commits the state it reads, so without the flush it reads the state from before the last keystroke and reports a second, stale time (09:03 after 09:30). `TimeField` leaves `onExitPast` unset and takes the plain `commit` path. The edge passed to `onExitPast` is in logical order, so RTL swaps the arrow keys but not the edge (`timeFieldKeys.ts`, `moveFocus`).
- `RangeCalendar` draws its pending span (`data-preview`) from whichever of the hovered and the focused day moved last (`RangeCalendar.tsx`, `hoveredRef`/`focusedRef`). In Chromium a cursor left over from an earlier test's `userEvent.hover` fires pointer events when the calendar re-renders under it, which makes the hovered day the latest source and overrides a preview a test set by focus. Keyboard tests therefore sit before any hover in `RangeCalendar.browser.test.tsx`, and a day's background has Calendar's colour transition, so an assertion on a background that changes after mount needs `expect.poll`.
