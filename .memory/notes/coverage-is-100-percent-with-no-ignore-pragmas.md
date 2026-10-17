---
name: coverage-is-100-percent-with-no-ignore-pragmas
kind: invariant
description: Every package gates v8 coverage at 100 except ui, which gates at 80 (ADR-0048); no ignore pragma exists in source and the ignore budget is 0; lydite is a separate PR-baseline gate.
anchors:
  - path: source/react-ui/packages/ui/vitest.config.ts
    blob: 6f09c94180b8
  - path: source/react-charts/packages/charts/vitest.config.ts
    blob: 0ddfccd30b06
  - path: source/react-ui/packages/icons/vitest.config.ts
    blob: b281c1c3cc6f
  - path: source/react-ui/packages/tokens/vitest.config.ts
    blob: 055b74b29290
  - path: source/react-ui/packages/telemetry/vitest.config.ts
    blob: 039bb98ec0c3
  - path: docs/adr/0048-ui-coverage-gate-is-80-percent.md
    blob: 68ea37a531e2
  - path: .lydite/components.yml
    blob: 5d78d1592e95
confidence: verified
---

Thresholds (statements, branches, functions, lines) are 100 in charts, icons, tokens and telemetry, but
**80 in `@vipengele/react-ui`** (`ui/vitest.config.ts:15-20`). That is deliberate: ADR-0048 supersedes
ADR-0047 for ui only, because a 100% gate pressures component design toward fewer branches. Do not
"correct" ui back to 100. A "100% coverage" target for a new ui component is self-imposed, not what
`pnpm test` enforces.

The pragma rule is independent of the threshold and holds in every package.
`grep -rnE "v8 ignore|istanbul ignore|c8 ignore" source` finds no file. ADR-0048 restates ADR-0047's
policy: an unreachable line may take `/* v8 ignore next -- <reason> */` (or a start/stop pair), nothing
wider; the budget is 0 and no ignore may be added until the budget and reason checks exist; a reachable
branch never takes a pragma (it is tested or left visibly uncovered).

lydite is separate: `.lydite/components.yml` maps one component per package (ui is one entry, a new ui
component needs none) and carries no threshold. Its gate compares against a baseline, so lowering the
vitest threshold does nothing to it; see [[lydite-coverage-gate-is-a-baseline-comparison]]. The only
inline marker in source is `[lydite:exclude_from_mutation][reason]` (`ZoomLayer.tsx:83`,
`formatters.ts:15`), a mutation exemption with a mandatory reason, not a coverage one.
