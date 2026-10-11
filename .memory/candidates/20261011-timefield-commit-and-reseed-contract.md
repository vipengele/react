---
about: TimeField reseeds its segments from the committed value only while focus is outside the group, keys the layout on the locale tag rather than the Locale object, and treats a present value prop as controlled even when it is undefined
saw:
  - source/react-ui/packages/ui/src/TimeField/TimeField.tsx
  - source/react-ui/packages/ui/src/TimeField/timeSegments.ts
  - source/react-ui/packages/ui/src/TimeField/TimeField.test.tsx
---

Checked 2026-10-11 (react-ui 0.1.x).

- ADR-0025's hard rule is that a controlled update must not overwrite an edit in progress.
  `TimeField.tsx` reseeds the segment state during render only when `!focusWithin` and the committed
  value differs (`LocalTime#equals`), or when the layout key changes. An update that arrives
  mid-edit waits until focus leaves the group.
- A caller can write `locale={new Locale("de-DE")}` inline, a new object every render, and a
  `LocalTime` that equals the last one. Keying the reseed on object identity would loop or wipe an
  incomplete entry, so the layout key is `${locale.tag}|${seconds}` and values compare with
  `equals`.
- `value={undefined}` is a controlled empty field. `TimeField.tsx` decides controlled-ness with
  `"value" in props` and passes `null` into `useControllableState` for empty, because that hook's
  own `undefined` means uncontrolled.
- A `LocalTime` with non-zero seconds in a field without `seconds` shows hour and minute only.
  `commitTimeState` in `timeSegments.ts` returns `unchanged` until `edited` is set, so the value and
  the hidden input keep their seconds until the first edit, and that commit zeroes them.
- The segments are `<span role="spinbutton">`, so a browser never submits a form implicitly on
  Enter from them. The Enter handler commits inside `flushSync` without `preventDefault`, which only
  keeps the hidden input current within the same tick.
- Stepping a 12-hour hour leaves AM/PM alone (11 PM up gives 12 PM); the period changes only through
  its own segment. Typed-letter matching uses the first character where the two day-period labels
  differ, so a ko-KR label cannot be matched by a typed letter without IME handling.
