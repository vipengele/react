---
about: "every date, time and date-time field types and steps through one owner per rule; the date-time fields call the date and time rules rather than carrying their own, and src/fieldParity.test.tsx fails when a field drifts"
saw:
  - source/react-ui/packages/ui/src/DateField/dateFieldEditing.ts
  - source/react-ui/packages/ui/src/TimeField/timeSegments.ts
  - source/react-ui/packages/ui/src/DateTimeField/dateTimeFieldModel.ts
  - source/react-ui/packages/ui/src/DateTimeRangeField/DateTimeRangeField.tsx
  - source/react-ui/packages/ui/src/fieldParity.test.tsx
---

Owners. Date completeness and literal matching: `readDateRun` and `startsWithLiteral` in `dateFieldEditing.ts`,
called by `withSeparator` (DateField, DateRangeField) and by `typeDateTimeText` (DateTimeField, DateTimeRangeField).
Time entry: `enterTimeText` and `settleTimeText` in `timeSegments.ts`, thin text-facing wrappers over `enterDigit`,
`selectDayPeriod` and `endEntry`, sharing `numericText` (the padding rule) with `displaySegments`. Stepping:
`stepDate` and `stepSegment`, composed by `stepDateTimeText` in `dateTimeFieldModel.ts`. A fix to a rule goes in its
owner; a copy in a field drifts.

The time half of the date-time text follows TimeField, not the date rule: a digit completes a segment when
pending+key is in range or `digit*10 > max`, and a completed segment is zero-padded in the text. In a 24-hour hour `1`
then `3` stays `13` and `2` then `4` becomes `04`; in a 12-hour hour `1` then `9` becomes `09`. A day-period key is
chosen by the first character at which the AM and PM names differ (`selectDayPeriod`), so a Latin `a`/`p` does nothing
in ko-KR.

`DateTimeField/dateTimeFieldModel.ts` imports `DateField/dateFieldEditing.ts` and `TimeField/timeSegments.ts`; the range
components import the single-value models, never the reverse. DateTimeRangeField still duplicates DateTimeField's
private `useTimeDisabled` and `isCommitKey`, and a step onto a disabled day is refused in its `stepEnd`, because
`stepDateTimeText` passes `stepDate` only the min/max dates.

Parity is asserted on displayed text, never on committed values: `parseDateTimeText` and the time parsers accept
unpadded digits and either letter case, so two fields showing different text can commit the same value.
`src/fieldParity.test.tsx` runs one script of logical keys through a reference field (DateField's box, TimeField's
`displaySegments` joined) and every field that holds the same date or time.
