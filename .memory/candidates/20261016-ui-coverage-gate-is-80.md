---
about: ui's vitest coverage threshold is 80, not 100; the note claiming 100 for every package is wrong for ui
saw:
  - source/react-ui/packages/ui/vitest.config.ts
  - docs/adr/0048-ui-coverage-gate-is-80-percent.md
  - docs/adr/0047-coverage-stays-at-100-percent-with-reasoned-ignores.md
targets: coverage-is-100-percent-with-no-ignore-pragmas
verdict: now-false
---
`ui/vitest.config.ts` thresholds block is statements/branches/functions/lines = 80 (read directly).
ADR-0048 (accepted) supersedes ADR-0047 for `ui` only; icons, tokens, telemetry, charts stay at 100.
The "no ignore pragmas" half still stands (ADR-0048 keeps the budget at 0; pragmas need a reason).
lydite gating is a drop-vs-baseline comparison on the `ui` component in `.lydite/components.yml`;
there is no per-component registration beyond that file's existing `ui` entry, so a new ui
component needs none. The issue's "100% coverage" for StatTile is therefore a self-imposed target in
ui, not what `pnpm test` enforces; lydite would still flag a drop.
