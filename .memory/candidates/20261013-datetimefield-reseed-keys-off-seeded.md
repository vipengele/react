---
about: DateTimeField reseeds its two halves by comparing the committed value with the last seeded-or-emitted value rather than with the previous prop, and flags a half-filled field invalid only after focus has left the whole group
saw:
  - source/react-ui/packages/ui/src/DateTimeField/dateTimeFieldModel.ts
  - source/react-ui/packages/ui/src/DateTimeField/DateTimeField.tsx
  - source/react-ui/packages/ui/src/DateTimeField/DateTimeField.test.tsx
---

Checked 2026-10-13 (react-ui 0.1.x).

- `reseedHalves` in `dateTimeFieldModel.ts` compares the committed value with `seeded`, which
  `DateTimeField.tsx` sets to the incoming value on a reseed and to every value it reports,
  `undefined` after a clear included. Comparing with the previous prop instead would wipe a
  half-filled field whenever a controlled `value={undefined}` re-renders, and would not restore a
  value the parent holds after declining a reported clear.
- A complete entry outside `min`/`max` is never reported, so `seeded` stays `undefined` and a
  controlled `value={undefined}` leaves that entry on screen, flagged invalid on both halves. A
  reseed rule keyed on "undefined while both halves are complete" would erase what the user typed.
- `groupLeft` is set by the root's `onBlur` when `relatedTarget` is outside the root and cleared by
  the root's `onFocus`, so a half-filled field is flagged only after focus has left the group and
  not while it moves between the halves.
- `TimeField` reports `undefined` only once every segment is emptied (`commitTimeState` yields
  `incomplete` for a partly filled state); a partly emptied time flags itself but leaves
  `halves.time` at the old time, so the joined value clears only then.
