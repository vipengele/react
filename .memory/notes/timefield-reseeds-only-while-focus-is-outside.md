---
name: timefield-reseeds-only-while-focus-is-outside
kind: invariant
description: TimeField reseeds its segments from the committed value only while focus is outside the group, keys the layout on the locale tag rather than the Locale object, and treats a present value prop as controlled even when undefined.
anchors:
  - path: source/react-ui/packages/ui/src/TimeField/TimeField.tsx
    blob: 4dc29d5a34da
  - path: source/react-ui/packages/ui/src/TimeField/timeSegments.ts
    blob: f5e6eedbdb11
  - path: source/react-ui/packages/ui/src/TimeField/TimeField.test.tsx
    blob: 3455e311f3f0
confidence: suspect
---

- ADR-0025's hard rule is that a controlled update must not overwrite an edit in progress. `TimeField.tsx` reseeds the segment state
  during render only when `!focusWithin` and the committed value differs (`LocalTime#equals`), or when the layout key changes.
- A caller can write `locale={new Locale("de-DE")}` inline, a new object every render. Keying the reseed on object identity would
  loop or wipe an incomplete entry, so the layout key is `${locale.tag}|${seconds}` and values compare with `equals`.
- `value={undefined}` is a controlled empty field: controlled-ness is `"value" in props` (`TimeField.tsx:102`), and `null` is passed
  into `useControllableState` for empty because that hook's own `undefined` means uncontrolled (see
  [[use-controllable-state-cannot-express-controlled-empty]]).
- A `LocalTime` with non-zero seconds in a field without `seconds` shows hour and minute only. `commitTimeState` in
  `timeSegments.ts` returns `unchanged` until `edited` is set, so the value and hidden input keep their seconds until the first
  edit, and that commit zeroes them.
- Segments are `<span role="spinbutton">`, so a browser never submits a form implicitly on Enter from them; the Enter handler
  commits inside `flushSync` without `preventDefault`, which only keeps the hidden input current within the tick.
- Stepping a 12-hour hour leaves AM/PM alone (11 PM up gives 12 PM); the period changes only through its own segment. Typed-letter
  matching uses the first character where the two day-period labels differ, so a ko-KR label cannot be matched by a typed letter
  without IME handling.
