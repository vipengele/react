---
about: the ui package gates coverage at 80% while every other package stays at 100%, and the budgeted reasoned-ignore rule is unchanged
saw:
  - docs/adr/0048-ui-coverage-gate-is-80-percent.md
  - docs/adr/0047-coverage-stays-at-100-percent-with-reasoned-ignores.md
  - source/react-ui/packages/ui/vitest.config.ts
  - source/react-ui/packages/ui/AGENTS.md
---
The note `coverage-is-100-percent-with-no-ignore-pragmas` is no longer true for `@vipengele/react-ui`; it stays true
for `icons`, `tokens`, `telemetry` and `charts`. This is deliberate, so a curator must not "correct" ui back to 100.

- `source/react-ui/packages/ui/vitest.config.ts` sets statements, branches, functions and lines thresholds to 80.
  ADR-0048 supersedes ADR-0047 (its frontmatter reads `status: superseded by ADR-0048`) and records why: a 100% gate
  pressures a large component's design toward fewer branches, and the decision is that design is never shaped by what is
  cheaper to test.
- What survives from ADR-0047 in every package, ui included: an unreachable line may take `/* v8 ignore next -- <reason> */`
  (or a start/stop pair), nothing wider; the budget is 0; no ignore may be added until the budget and reason checks
  exist; a reachable branch never takes a pragma (it is tested or left visibly uncovered). The threshold and the pragma
  rule are independent.
- `source/react-ui/packages/ui/AGENTS.md` (`## Coverage`) states the 80% figure and points at both ADRs.
- The lydite PR gate is separate from the vitest thresholds; see the lydite candidate.
