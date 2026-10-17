---
about: "withSeparator rewrites only an end-appended single character and nothing handles the caret, so DateTimeField auto-append relies on the caret being at the end"
saw:
  - source/react-ui/packages/ui/src/DateField/dateFieldEditing.ts
  - source/react-ui/packages/ui/src/DateField/DateField.tsx
  - source/react-ui/packages/ui/src/DateTimeField/DateTimeField.tsx
  - source/react-ui/packages/ui/src/DateTimeField/dateTimeFieldModel.ts
  - source/react-ui/packages/ui/src/TimeField/timeSegments.ts
---

Prompted by planning issue #197 (DateTimeField auto-separators and a/p day-period completion). No ADR or note
records why `withSeparator` is end-only; the only statement is the doc comment (`dateFieldEditing.ts:174-175`) and
AGENTS.md. The reasons below are inferred from the code, not recorded.

- `withSeparator(previous, next, locale)` returns `next` untouched unless `next.length === previous.length + 1 &&
  next.startsWith(previous)` (`dateFieldEditing.ts:178`). Deletion, paste, mid-text edit and replaced selection all fall out.
- Caret: grep for `selectionStart|setSelectionRange` in non-test src finds only `DateField.tsx:316,326` and
  `useDateRangeFieldState.ts:88,102`, both inside the arrow-key step path (`stepBy`), where `flushSync` is used so the
  caret can be placed after React writes the value (`DateField.tsx:321-327`). The `onChange` path
  (`DateField.tsx:424`, `DateRangeField.tsx:441`) does no caret work: it just `setDraft(withSeparator(...))`. So a
  controlled input whose value grows by a separator relies on React/browser leaving the caret at the end, which is
  where it already was because the character was appended at the end. Rewriting mid-text would move the caret to the
  end (React sets `.value`), which is why the end-only guard is load-bearing.
- IME: no composition handling in the DateField change path; compositions are handled only in TimeField's
  `beforeinput` listeners (`TimeField/timeFieldInput.ts:34-82`) and Enter guards (`event.nativeEvent.isComposing`,
  `DateField.tsx:116`, `DateTimeField.tsx:148`). During a composition each update reports the whole composed text so
  far, so an appended-separator rewrite mid-composition would fight the IME (inferred, untested).
- Completeness: a numeric field is complete only when its digit count equals `FIELD_DIGITS` (year 4, month 2, day 2;
  `dateFieldEditing.ts:152,197`). There is no max-value rule and no padding: `4` stays `4` (no `04/`), `1` then `0` gives
  `10/`. TimeField differs: `enterDigit` completes on max (`digit * 10 > max`, e.g. `3` in a 24h hour, `2` in a 12h hour,
  `6` in a minute; `timeSegments.ts:186-208`) and does not pad in the text model. A DateTimeField auto-append for the time
  half needs its own completeness rule; `FIELD_DIGITS` has no hour/minute entries and `DateSegment` types are only
  year/month/day.
- Trailing separator is never added (`segments[index + 2] !== undefined`, `:198`), which is what makes ko-KR's
  trailing `.` safe; multi-char literals like `. ` are matched by `rest.startsWith(segment.value)` (`:186`) and
  covered by tests (`dateFieldEditing.test.ts:250,271`).
- DateTimeField does not call it: `DateTimeField.tsx:482` is `onChange={(event) => field.setDraft(event.target.value)}`.
  ADR-0049 (`docs/adr/0049-datetimefield-naming-and-commit-rule.md`) says nothing about it, so not-done rather than a
  recorded decision. `withSeparator` itself takes the text only up to the end of the date: a date-time string past the
  last date field ("10/10/2026 5") is returned untouched (`dateFieldEditing.test.ts:269-272`), and it builds from
  `SAMPLE_DATE.segments`, i.e. date only, so it cannot be reused as-is for a time-first locale (`vi`).
- Day period: the existing typed-letter matcher is `selectDayPeriod` (`timeSegments.ts:263-271`): compares lower-cased
  labels at the first index where am/pm differ, so `a`/`p` for en-US and a ko-KR label (`오전`/`오후`) cannot be matched
  by a typed Latin letter. Reusable for the letter -> AM/PM decision.
- U+202F: no non-test source handles it; only tests normalise it (`dateTimeFieldModel.test.ts:31-35`,
  `DateTimeField.test.tsx:21`). Parsing relies on `@vipengele/ts` `tryParseLocalized`. `parseSpacedHalves` splits on
  `\s+` (`dateTimeFieldModel.ts:80`), which matches U+202F, so reading is lenient; typed text containing a plain space
  before PM is thus accepted.
