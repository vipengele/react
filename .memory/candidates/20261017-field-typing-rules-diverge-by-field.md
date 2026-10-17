---
about: "typing rules differ per field family: TimeField is segment/max-value, DateField and DateRangeField are free text with withSeparator, DateTimeField and DateTimeRangeField are raw free text with neither"
saw:
  - source/react-ui/packages/ui/src/TimeField/timeSegments.ts
  - source/react-ui/packages/ui/src/TimeField/timeFieldKeys.ts
  - source/react-ui/packages/ui/src/TimeField/useTimeField.ts
  - source/react-ui/packages/ui/src/DateField/dateFieldEditing.ts
  - source/react-ui/packages/ui/src/DateField/DateField.tsx
  - source/react-ui/packages/ui/src/DateRangeField/DateRangeField.tsx
  - source/react-ui/packages/ui/src/DateTimeField/DateTimeField.tsx
  - source/react-ui/packages/ui/src/DateTimeField/dateTimeFieldModel.ts
  - source/react-ui/packages/ui/src/DateTimeRangeField/DateTimeRangeField.tsx
---

Found answering "can DateTimeField's time half type like TimeField". No note, ADR or AGENTS.md rule
states a shared typing behaviour; no test compares fields (grep for consistency/"every field" in
*.test.* -> 0 hits). Nobody decided the divergence; it is the result of ADR-0049 choosing one text input.

TimeField (`timeSegments.ts`): `enterDigit` (:195-216). Pending draft = `{segment,text}` (:48), so
pending state lives outside the value. Advance when pending+key in [min,max] (:205) or `digit*10 > max` (:209).
Ranges `rangeOf` :128: minute/second 0-59, 12h hour 1-12, 24h hour 0-23. A pending digit is shown
UNPADDED (`draft ?? padStart(2,"0")`, :169); a complete segment is padded. 12h: `0` -> value undefined, draft "0"
(:213), `00` restarts at "0" (combined 0 out of range), `1` pending (value 1), `12` advance, `13` restarts as `3` and advances.
Minute 6-9 fill and advance as 06-09. Day period: `selectDayPeriod` :263 picks by first differing char,
case-insensitive; not a digit entry. Past the last segment: `completeSegment` (`useTimeField.ts:~180-195`)
commits, and calls `onExitPast("end")` inside flushSync only when the host (TimeRangeField) set it.
Digit entry is never bound-checked (see timefield-bounds-are-whole-time-checks).

Driving it from text: no existing code parses text into TimeFieldState. `initialTimeState(layout, LocalTime)`
(:137) seeds only from a complete time; there is no partial-text reader and no formatter that emits
`draft` text. State has `draft` + `hour` value separately; "1" is hour=1 with draft "1", while a
committed 01 has draft undefined, so text "1" vs "01" is the only (lossy, unpadded-vs-padded) signal.
Text "12" is ambiguous with nothing (complete); text "1" is pending iff unpadded.

Field-by-field date typing today (the violation of "all dates behave the same"):
- DateField `DateField.tsx:424`: `setDraft(withSeparator(draft, value, locale))` plus ArrowUp/Down stepping
  by caret segment (`:77`, `:106`, `segmentAt`). Rule: fixed digit count (`FIELD_DIGITS` year4 month2 day2,
  `dateFieldEditing.ts:152`), separator auto-appended only when a field reaches that count and another follows (:197-198).
- DateRangeField `DateRangeField.tsx:441`: same `withSeparator` and `STEP_KEYS` (:92) -> agrees with DateField.
- DateTimeField `DateTimeField.tsx:482`: `field.setDraft(event.target.value)` raw; no `withSeparator`, no
  ArrowUp/Down handler (`handleKeyDown` :421 only handles commit keys). DISAGREES with DateField.
- DateTimeRangeField `DateTimeRangeField.tsx:664`: `setDrafts({..., [which]: text})` raw, no stepping. Disagrees.
Time half of DateTimeField is parsed only at commit: `parseDateTimeText` (`dateTimeFieldModel.ts:98`) via
`LocalTime.tryParseLocalized`, accepting unpadded digits and case-folded day period.

Ranges: TimeRangeField runs two `useTimeField` (`TimeRangeField.tsx:273-274`) so it types exactly like
TimeField (reuses model). DateRangeField reuses DateField's helpers by import. DateTimeRangeField does NOT
reuse DateTimeField's private helpers: AGENTS.md says its model duplicates DateTimeField's placeholder/format-description
helpers and `useTimeDisabled`/`isCommitKey` rather than importing them (the file also exports its own `formatHint`, :248), while
it does import `formatDateTimeText`, `dateBounds`, `timeBounds`, `serialiseDateTime` from `dateTimeFieldModel`.
Any change to DateTimeField typing must be mirrored in DateTimeRangeField.
