---
about: ADR-0025 (proposed) fixes the value type, locale and hidden-input shape for TimeField but leaves seconds and 12/24h override to the TimeField issue; the installed @vipengele/ts floor (^0.0.2) has no local types yet
saw:
  - docs/adr/0025-date-and-time-are-zoneless-local-values-from-ts.md
  - CONTEXT.md
  - source/react-ui/packages/ui/package.json
---

Read in full; status is `proposed` (ADR:2).

Decides: custom segmented controls everywhere, no native `<input type="date">` (:16-21, :98-104).
"ts" is `@vipengele/ts`, the sibling umbrella package (not Temporal, which is rejected :111-113).
Value is `LocalTime` (`LocalDate`/`LocalDateTime`), `value`/`defaultValue`/`onChange(v | undefined)`,
empty is `undefined` (:23-33). `onChange` on commit only; visible control has no `name`; sibling
hidden input carries ISO 8601 (`14:30`, `14:30:15`) (:33-37). Controlled update must not overwrite
an edit in progress (:37). react-ui carries no date arithmetic or date library (:39). Locale resolves
prop, else `LocaleProvider` (in `@vipengele/react-tokens`), else runtime default (:68-75); a
`Locale` carries 12/24h preference, first day of week, names (:49-50). TimeField has NO `hourCycle`
prop: it follows the Locale (:78-80, rejected :133-135). No `timeZone` prop (:55-60).

Left open for TimeField's own issue (:149-150): whether it supports seconds, and whether it overrides
the 12/24h default. min/max validity is deferred to Calendar/DatePicker/range issues (:151-153), so
TimeField min/max/step is also undecided. Segment editing is only described in passing ("a segmented
text control that edits ... one segment at a time", :17-18). No ADR text on segment ARIA.

Dependency state: `ui/package.json:39` has `"@vipengele/ts": "^0.0.2"` as a runtime dep. ADR-0025
:63-66 says Wave 4 starts only after a release containing the local types is published and the range is
raised. `grep -rn 'LocaleProvider\|LocalTime\|LocalDate\|useLocale' source` hit nothing outside docs
(only ADR-0025 and CONTEXT.md:246-256 define them). So neither `LocaleProvider` nor the types exist
in code yet; the work is tracked as vipengele/typescript#87 (:53). I could not confirm which
@vipengele/ts version is published (no node_modules installed in this checkout).
ADR 0025 also says NumberInput's no-locale-prop rule (ADR-0020) does not survive (:82-86).
