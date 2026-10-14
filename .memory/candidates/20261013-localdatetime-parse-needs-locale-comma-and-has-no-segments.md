---
about: LocalDateTime.parseLocalized only reads the exact Intl combined layout (comma included) and LocalDateTime has no segments(), so a single-text-input date-time field cannot lean on ts to read or locate fields in "MM/DD/YYYY hh:mm AM"
saw:
  - source/react-ui/node_modules/.pnpm/@vipengele+ts-core-common@0.2.0/node_modules/@vipengele/ts-core-common/dist/types/date-time/local-date-time.d.ts
  - source/react-ui/node_modules/.pnpm/@vipengele+ts-core-common@0.2.0/node_modules/@vipengele/ts-core-common/dist/types/date-time/locale-format.d.ts
  - source/react-ui/packages/ui/src/DateField/dateFieldEditing.ts
  - source/react-ui/packages/ui/src/TimeField/timeSegments.ts
---

Checked 2026-10-13 against @vipengele/ts-core-common 0.2.0 by running node in packages/ui.

- `LocalDateTime` exposes `format(locale)`, `parseLocalized`, `tryParseLocalized`, `tryParse` (ISO), `toString` (ISO, `:ss` only when non-zero) and `compare` (`local-date-time.d.ts`). It has NO `segments()`, unlike `LocalDate#segments` (used by `segmentRanges`, `formatHint`, `withSeparator` in `dateFieldEditing.ts:88,161,177`) and `LocalTime#segments` (used by `timeLayout`, `timeSegments.ts:109`).
- `format()` is Intl's combined layout, not date + space + time: en-US `10/03/2026, 01:30 PM`, de-DE `03.10.2026, 13:30`, ja-JP `2026/10/03 13:30`, vi `13:30 03/10/2026` (time first), ko-KR `2026. 10. 03. 오후 01:30` (period before time). `Locale#hourCycle` is `h12`/`h23`; ko-KR is h12 with `uses24Hour` false.
- `tryParseLocalized` results (en-US): `10/03/2026, 01:30 PM` ok; `10/3/2026, 1:30 PM` ok (unpadded digits accepted); `10/03/2026, 1:30 pm` ok (period case-folded); `10/03/2026 01:30 PM` (no comma) FAIL; `10/03/2026,01:30 PM` FAIL; ISO `2026-10-03T13:30` FAIL in tryParseLocalized but ok in `tryParse`. Whitespace matches any whitespace, but the literal comma is required.
- Consequence: a placeholder `MM/DD/YYYY hh:mm AM` (no comma) disagrees with what `format()` writes and `tryParseLocalized` reads. A field showing that shape must either build the text from `LocalDate#format` + `LocalTime#format` itself and parse the two halves separately (`LocalDate.tryParseLocalized`, `LocalTime.tryParseLocalized`, both accept unpadded input), or accept the locale's comma. `DateField`'s `parseDateText` ISO fallback (`dateFieldEditing.ts:210`) has no date-time analogue unless it calls `LocalDateTime.tryParse`.
- `LocalTime.dayPeriods(locale)` gives `{am, pm}` labels (en-US AM/PM, pt-PT `da manhã`/`da tarde`, ja-JP 午前/午後, vi SA/CH).
