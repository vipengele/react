---
about: TimeField min and max bound the whole LocalTime, so the segment model refuses an arrow step only when every segment is filled, checks digit entry per segment only, and rejects an out-of-range complete time on commit, immediately when it is the last segment filled
saw:
  - source/react-ui/packages/ui/src/TimeField/timeSegments.ts
  - source/react-ui/packages/ui/src/TimeField/useTimeField.ts
  - source/react-ui/packages/ui/src/TimeField/TimeField.tsx
  - source/react-ui/packages/ui/src/TimeField/TimeField.test.tsx
---

Checked 2026-10-13.

- A bound is a whole `LocalTime` but segments are edited one at a time. `stepSegment` in
  `timeSegments.ts` returns the same state object when the field is fully filled and the stepped time
  is out of bounds; with any segment empty it steps freely, because one segment alone cannot decide
  whether the final time is in bounds. `enterDigit` does no bound check.
- `commitTimeState` returns `{ kind: "rejected" }` for an edited, filled, out-of-range time; an
  unedited state stays `unchanged` whatever its time. A field without a `second` segment is checked
  against the zero-second time it would commit.
- `useTimeField.ts` keeps the rejected time on screen, does not call `onChange`, and exposes
  `rejected`. Unlike `incomplete`, which the last-segment-filled path (`commit(next, false)`) does not
  flag, `rejected` is set on every commit including that one, since no segment is left to continue in.
  A controlled update landing while focus is outside the group clears it.
- `committedRejected` marks a `value`/`defaultValue` already outside the bounds: shown
  `aria-invalid`, never corrected, `onChange` never fired. `stepSegment` judges only the time a
  step lands on, never the one it starts from, so a step from such a value is refused while it still
  lands out of bounds and accepted once it lands inside (min 9:00, 8:59, ArrowUp on Hour gives 9:59).
- `TimeField.tsx` ORs `incomplete`, `rejected`, `committedRejected` and the `aria-invalid` prop into the
  group. Segment `aria-valuemin`/`aria-valuemax` stay per-segment, and `min` after `max` is unsupported.
