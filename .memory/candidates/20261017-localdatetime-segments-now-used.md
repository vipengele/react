---
about: "the claim that LocalDateTime has no segments() no longer matches the code, which calls it"
saw:
  - source/react-ui/packages/ui/src/DateTimeField/dateTimeFieldModel.ts
  - source/react-ui/packages/ui/package.json
targets: vipengele-ts-date-parsing-is-iso-only-unless-localized
verdict: now-false
---

The note says `LocalDateTime` has no `segments()` (observed on `@vipengele/ts-core-common` 0.2.0).
`dateTimeFieldModel.ts:48` calls `REFERENCE_DATE_TIME.segments(locale)` on a `LocalDateTime` and types the result as
`DateTimeSegment` (`:1,41,44`), and `package.json:40` pins `@vipengele/ts` `^0.2.1`. AGENTS.md and ADR-0049 also say the
text is "ordered by `LocalDateTime#segments`". So that part is now false for the version in use.

Not re-run against the installed library: `node_modules` is absent in this checkout, so the .d.ts was not read. The rest
of the note (ISO-only `tryParse`, comma-required `tryParseLocalized` for the combined layout) is consistent with
`parseDateTimeText` trying `parseSpacedHalves` first and the combined/ISO readers after (`dateTimeFieldModel.ts:98-102`),
but is `unchecked` here.
