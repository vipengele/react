---
name: typing-rules-rewrite-only-a-single-appended-character
kind: invariant
description: The date and date-time typing rules rewrite only a single character appended at the end of the text, and the onChange path does no caret work, so a rewrite anywhere else would send the caret to the end.
anchors:
  - path: source/react-ui/packages/ui/src/DateField/dateFieldEditing.ts
    blob: 60031c032e37
  - path: source/react-ui/packages/ui/src/DateField/DateField.tsx
    blob: 385d2d7a892b
  - path: source/react-ui/packages/ui/src/DateField/useComposedTyping.ts
    blob: 3c8a8d9e1956
  - path: source/react-ui/packages/ui/src/DateTimeField/dateTimeFieldModel.ts
    blob: a6836f6e4eb9
confidence: suspect
---

`withSeparator` (`dateFieldEditing.ts:177-178`) and `typeDateTimeText` (`dateTimeFieldModel.ts:182-183`) return `next`
untouched unless `next.length === previous.length + 1 && next.startsWith(previous)`; deletion, paste, a mid-text edit and a
replaced selection all fall out of that guard.

The guard is load-bearing: the explorer reports that the `onChange` path of DateField, DateRangeField, DateTimeField and
DateTimeRangeField does no caret work and only sets the draft. A controlled input whose value grows at the end keeps the
caret at the end, where it already was; a rewrite elsewhere would make React write `.value` and move the caret to the end.
Caret placement exists only in the arrow-key step path, where `flushSync` runs first (`DateField.tsx:323`) so the input
holds the stepped text before `setSelectionRange`.

IME: `useComposedTyping.ts:28` keeps the raw text while `isComposing` is true and applies the rule otherwise; per the
explorer, at `compositionend` the rule runs once against the text captured at `compositionstart`, so a composed Hangul
syllable is a single appended character.

A typed non-digit that repeats the previous character is dropped (`dateFieldEditing.ts:180`), with U+0020, U+00A0 and
U+202F read as the same character (`startsWithLiteral`, `:198`); the same drop is at `dateTimeFieldModel.ts:187`. The date
rule completes a field only at its `FIELD_DIGITS` count (year 4, month 2, day 2) and adds no padding; in the combined text a
completed day also appends every literal up to the next editable segment, so ko-KR reads `2026. 10. 15. ` before the day
period (explorer report, not re-run).
