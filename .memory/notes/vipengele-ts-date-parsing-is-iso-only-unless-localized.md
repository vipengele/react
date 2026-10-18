---
name: vipengele-ts-date-parsing-is-iso-only-unless-localized
kind: gotcha
description: In @vipengele/ts, LocalDate/LocalDateTime tryParse is ISO-only and the locale-aware readers are tryParseLocalized; LocalDateTime's reads the exact Intl layout (comma required), contrary to what ADR-0025 says.
anchors:
  - path: docs/adr/0025-date-and-time-are-zoneless-local-values-from-ts.md
    blob: c00e96fd023e
  - path: source/react-ui/packages/ui/src/DateField/dateFieldEditing.ts
    blob: 60031c032e37
  - path: source/react-ui/packages/ui/src/TimeField/timeSegments.ts
    blob: eb74f099909e
  - path: source/react-ui/packages/ui/src/DateTimeField/dateTimeFieldModel.ts
    blob: a6836f6e4eb9
  - path: source/react-ui/packages/ui/src/NumberInput/NumberInput.tsx
    blob: e59320800703
confidence: suspect
---

Found by an explorer reading the installed `@vipengele/ts-core-common` 0.2.0 `.d.ts` and running node in `packages/ui`;
`node_modules` is absent in later checkouts, so the library claims below were not re-run. The code that calls the library is
consistent with them but does not prove them.

- ADR-0025 says each type has locale-aware `tryParse` and `format` "in the shape of `Numeric.tryParse`". The library
  differs: `LocalDate.tryParse`/`parse` read ISO `YYYY-MM-DD` only; the locale-aware readers are `parseLocalized(str, locale?)`
  and `tryParseLocalized(str, locale?)`, returning `{ success, value? }`. `format(locale?)` and `segments(locale?)` are
  locale-aware. The code mirrors this: `dateFieldEditing.ts:268` tries `LocalDate.tryParseLocalized(...)` then ISO
  `LocalDate.tryParse`; NumberInput's reader is `Numeric.tryParse(draft, locale).value` (`NumberInput.tsx:259`).
- `LocalDateTime` now has `segments(locale)`: `dateTimeFieldModel.ts:59` calls `REFERENCE_DATE_TIME.segments(locale)` on a
  `LocalDateTime`, and `@vipengele/ts` is pinned `^0.2.1` in `source/react-ui/packages/ui/package.json`. An earlier version of
  this note (0.2.0) said it had none; that no longer holds for the version in use. The field still builds its own text order
  from the date's and the time's segments (`dateTimeFieldModel.ts:75`, `:106`).
- `LocalDateTime#format` is Intl's combined layout, not date + space + time: en-US `10/03/2026, 01:30 PM`, de-DE
  `03.10.2026, 13:30`, ja-JP `2026/10/03 13:30`, vi `13:30 03/10/2026` (time first), ko-KR `2026. 10. 03. 오후 01:30` (period
  before time). Unchecked against 0.2.1.
- `tryParseLocalized` (en-US) accepts unpadded digits and a case-folded period, but `10/03/2026 01:30 PM` (no comma) and
  `10/03/2026,01:30 PM` fail, and ISO `2026-10-03T13:30` fails there but passes `tryParse`. Unchecked against 0.2.1.
  `parseDateTimeText` tries `parseSpacedHalves` (`dateTimeFieldModel.ts:226`) first and the combined/ISO readers after
  (`:249`), consistent with a comma-less text needing the halves read separately.
