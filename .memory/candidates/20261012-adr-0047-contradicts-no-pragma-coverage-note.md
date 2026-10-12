---
about: the reasoned v8 ignore rule now lives in ADR-0048 after ADR-0047 was superseded, and no pragma exists in source today
saw:
  - docs/adr/0048-ui-coverage-gate-is-80-percent.md
  - docs/adr/0047-coverage-stays-at-100-percent-with-reasoned-ignores.md
  - source/react-ui/packages/ui/vitest.config.ts
targets: coverage-is-100-percent-with-no-ignore-pragmas
verdict: still-true
---
The note is true of the code today as to pragmas (`grep -rnE "v8 ignore|istanbul ignore|c8 ignore" source` finds no files)
and false as to the threshold for `@vipengele/react-ui`: `packages/ui/vitest.config.ts` gates at 80 (ADR-0048, which
supersedes ADR-0047; the other packages stay at 100).

The note's rule "fixed with a test or deletion, not a pragma" is qualified by policy, not by code. ADR-0048 restates
ADR-0047's inline-ignore rule for every package: an unreachable line may take `/* v8 ignore next -- <reason> */` (or a
start/stop pair), the budget is 0, and no ignore may be added until the budget and reason checks exist. A reachable
branch never takes a pragma. Curator: add that qualification and cite ADR-0048.
