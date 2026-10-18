---
name: date-time-typing-rules-have-one-owner-each
kind: invariant
description: Every date, time and date-time field types and steps through one owner per rule; the date-time fields call the date and time rules rather than carrying their own, and src/fieldParity.test.tsx fails when a field drifts.
anchors:
  - path: source/react-ui/packages/ui/src/DateField/dateFieldEditing.ts
    blob: 60031c032e37
  - path: source/react-ui/packages/ui/src/TimeField/timeSegments.ts
    blob: eb74f099909e
  - path: source/react-ui/packages/ui/src/DateTimeField/dateTimeFieldModel.ts
    blob: a6836f6e4eb9
  - path: source/react-ui/packages/ui/src/DateTimeRangeField/DateTimeRangeField.tsx
    blob: e861932d5b75
  - path: source/react-ui/packages/ui/src/fieldParity.test.tsx
    blob: 6bec10ca8fdc
confidence: suspect
---

Owners (names and lines checked by grep): date completeness and literal matching are `readDateRun`
(`dateFieldEditing.ts:232`) and `startsWithLiteral` (`:198`), called by `withSeparator` (`:177`, DateField and
DateRangeField) and by `typeDateTimeText` (`dateTimeFieldModel.ts:182`, DateTimeField and DateTimeRangeField). Time entry is
`enterTimeText` (`timeSegments.ts:333`) and `settleTimeText` (`:356`). Stepping is `stepDate` (`dateFieldEditing.ts:136`)
and `stepSegment` (`timeSegments.ts:241`), composed by `stepDateTimeText` (`dateTimeFieldModel.ts:382`). A fix to a rule
goes in its owner; a copy in a field drifts.

The time half of the date-time text follows TimeField, not the date rule: a digit completes a segment when pending+key is
in range or `digit*10 > max`, and a completed segment is zero-padded in the text. In a 24-hour hour `1` then `3` stays
`13` and `2` then `4` becomes `04`; in a 12-hour hour `1` then `9` becomes `09`. A day-period key is chosen by the first
character at which the AM and PM names differ, so a Latin `a`/`p` does nothing in ko-KR (explorer report, not re-run).

`dateTimeFieldModel.ts` imports `dateFieldEditing.ts` and `timeSegments.ts`; the range components import the single-value
models, never the reverse. The explorer reported that DateTimeRangeField still duplicates DateTimeField's private
`useTimeDisabled` and `isCommitKey`, and that a step onto a disabled day is refused in its `stepEnd` because
`stepDateTimeText` passes `stepDate` only the min/max dates; not re-read.

Parity is asserted on displayed text, never on committed values: the parsers accept unpadded digits and either letter case,
so two fields showing different text can commit the same value. `src/fieldParity.test.tsx` runs one script of logical keys
through a reference field and every field that holds the same date or time.
