---
name: vipengele-ts-date-parsing-is-iso-only-unless-localized
kind: gotcha
description: In @vipengele/ts, LocalDate/LocalDateTime tryParse is ISO-only, the locale-aware readers are tryParseLocalized, and LocalDateTime's reads the exact Intl layout (comma required) and has no segments(), contrary to what ADR-0025 says.
anchors:
  - path: docs/adr/0025-date-and-time-are-zoneless-local-values-from-ts.md
    blob: c00e96fd023e
  - path: source/react-ui/packages/ui/src/DateField/dateFieldEditing.ts
    blob: 8b54f39d42e6
  - path: source/react-ui/packages/ui/src/TimeField/timeSegments.ts
    blob: f5e6eedbdb11
  - path: source/react-ui/packages/ui/src/NumberInput/NumberInput.tsx
    blob: e59320800703
confidence: suspect
---

Found by an explorer reading the installed `@vipengele/ts-core-common` 0.2.0 `.d.ts` and running node in `packages/ui` (node_modules
was not available in this pass, so not re-run).

- ADR-0025 says each type has locale-aware `tryParse` and `format` "in the shape of `Numeric.tryParse`". The installed library
  differs: `LocalDate.tryParse`/`parse` read ISO `YYYY-MM-DD` only; the locale-aware readers are `parseLocalized(str, locale?)` and
  `tryParseLocalized(str, locale?)`, returning `{ success, value? }`. `format(locale?)` and `segments(locale?)` are locale-aware.
  NumberInput's reader is `Numeric.tryParse(draft, locale).value`.
- `LocalDateTime` has `format`, `parseLocalized`, `tryParseLocalized`, ISO `tryParse`, `toString` and `compare` but **no
  `segments()`**, unlike `LocalDate#segments` (used by `dateFieldEditing.ts`) and `LocalTime#segments` (used by `timeSegments.ts`).
- `LocalDateTime#format` is Intl's combined layout, not date + space + time: en-US `10/03/2026, 01:30 PM`, de-DE
  `03.10.2026, 13:30`, ja-JP `2026/10/03 13:30`, vi `13:30 03/10/2026` (time first), ko-KR `2026. 10. 03. 오후 01:30` (period before
  time).
- `tryParseLocalized` (en-US) accepts unpadded digits and a case-folded period, but `10/03/2026 01:30 PM` (no comma) and
  `10/03/2026,01:30 PM` fail, and ISO `2026-10-03T13:30` fails there but passes `tryParse`. So a single-text-input date-time field
  cannot show a comma-less placeholder and parse with ts; it must format and parse the date and time halves separately
  (`LocalDate`/`LocalTime` `tryParseLocalized`), or accept the locale's comma.
