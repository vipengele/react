---
about: ADR 0047 allows budgeted, reasoned v8 ignores but forbids adding any until issue 159's enforcement lands, so the no-pragma note still holds in practice
saw:
  - docs/adr/0047-coverage-stays-at-100-percent-with-reasoned-ignores.md
  - source/react-ui/packages/ui/vitest.config.ts
  - source/react-ui/packages/ui/src/vitest.setup.ts
targets: coverage-is-100-percent-with-no-ignore-pragmas
verdict: still-true
---
`grep -rnE "v8 ignore" source --include=*.ts --include=*.tsx` -> 0 files. vitest.config.ts:15-20 thresholds still 100.
ADR 0047 says the budget starts at 0 and "until [the check] lands, no ignore may be added"; open issue #159 ("Enforce the
coverage-ignore reason check and per-package budget") is that follow-up. So DataTable cannot use pragmas yet; browser
tests (*.browser.test.tsx, chromium project, same coverage report) are the sanctioned way to cover layout branches.
Test setup facts: jsdom ResizeObserver is a no-op stub (src/vitest.setup.ts:14-18), so virtualizer measurement
(windowed rows, resize) is only provable in chromium; Dropdown.browser.test.tsx:331 comments the same.
The ADR also supersedes the note's implication that pragmas are never allowed; add that nuance.
