---
name: timefield-last-segment-commit-is-flushed-before-exit
kind: gotcha
description: A TimeField's last-segment commit is wrapped in flushSync before onExitPast moves focus, because the blur commits the state it reads and would otherwise report a second, stale time.
anchors:
  - path: source/react-ui/packages/ui/src/TimeField/useTimeField.ts
    blob: 64d36c393b44
  - path: source/react-ui/packages/ui/src/TimeField/timeFieldKeys.ts
    blob: e618d5ee76a9
  - path: source/react-ui/packages/ui/src/TimeRangeField/TimeRangeField.tsx
    blob: 4c17d666a5cc
confidence: verified
---

`useTimeField`'s `completeSegment` commits the last filled segment and, when the optional `onExitPast` is set, hands focus to a
neighbouring field. The commit is wrapped in `flushSync` (`useTimeField.ts:193`, `flushSync(() => commit(next, false))`) before
`onExitPast("end")` runs: focus leaving blurs the group, and the blur commits the state it reads, so without the flush it reads the
state from before the last keystroke and reports a second, stale time (09:03 after 09:30). `TimeField` leaves `onExitPast` unset
and takes the plain `commit` path. The edge passed to `onExitPast` is in logical order, so RTL swaps the arrow keys but not the
edge (`timeFieldKeys.ts`, `moveFocus`).
