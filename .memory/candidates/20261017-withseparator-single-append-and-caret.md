---
about: "the typing rules rewrite only a single character appended at the end of the text, and the change path does no caret work, so any rewrite elsewhere sends the caret to the end"
saw:
  - source/react-ui/packages/ui/src/DateField/dateFieldEditing.ts
  - source/react-ui/packages/ui/src/DateField/DateField.tsx
  - source/react-ui/packages/ui/src/DateTimeField/dateTimeFieldModel.ts
  - source/react-ui/packages/ui/src/DateTimeField/DateTimeField.tsx
---

`withSeparator` and `typeDateTimeText` return `next` untouched unless `next.length === previous.length + 1 &&
next.startsWith(previous)`. Deletion, paste, a mid-text edit and a replaced selection all fall out of that guard.

The guard is load-bearing. The `onChange` path of DateField, DateRangeField, DateTimeField and DateTimeRangeField does
no caret work: it only sets the draft. A controlled input whose value grows at the end keeps the caret at the end,
where it already was. A rewrite anywhere else would make React write `.value` and move the caret to the end. Caret
placement exists only in the arrow-key step path, where `flushSync` runs first so the input holds the stepped text
before `setSelectionRange`.

IME: while `nativeEvent.isComposing` is true the four free-text fields keep the raw text. At `compositionend` the rule
runs once against the text captured at `compositionstart`, so a composed Hangul syllable is a single appended
character. Without that, each composition update would be read as an append and rewritten against the IME.

A typed separator the field already appended is never doubled: a non-digit that repeats the previous character is
dropped, with U+0020, U+00A0 and U+202F read as the same character (`startsWithLiteral`). A typed space after an
appended no-break or narrow space is therefore dropped in the date and the date-time fields alike.

The date rule completes a field only at its `FIELD_DIGITS` count (year 4, month 2, day 2) and adds no padding; a
literal is appended only between two fields and never after the last field of the whole text. In the combined text a
completed day also appends every literal up to the next editable segment, so ko-KR reads `2026. 10. 15. ` before the
day period.
