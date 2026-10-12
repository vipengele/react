---
about: ADR-0047 permits reasoned v8 ignores (budgeted, enforcement not yet shipped); note says no pragmas
saw:
  - docs/adr/0047-coverage-stays-at-100-percent-with-reasoned-ignores.md
  - source/react-ui/packages/ui/vitest.config.ts
targets: coverage-is-100-percent-with-no-ignore-pragmas
verdict: still-true
---
Note is true of the code today (`grep -rnE "v8 ignore|istanbul ignore|c8 ignore" source` -> 0 files) and ADR-0047 says the same ("budget starts at 0"; no ignore may be added until the budget check ships). But the note's rule "fixed with a test or deletion, not a pragma" is now policy-superseded: ADR-0047 allows `/* v8 ignore next -- reason */` once the budget script lands. Curator should add that qualification.
