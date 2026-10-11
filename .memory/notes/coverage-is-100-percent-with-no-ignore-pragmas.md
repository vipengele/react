---
name: coverage-is-100-percent-with-no-ignore-pragmas
kind: invariant
description: Every package enforces 100% v8 coverage with no ignore pragmas in source; lydite is a separate PR-baseline gate, and the only inline marker is a mutation exemption that needs a reason.
anchors:
  - path: source/react-ui/packages/ui/vitest.config.ts
    blob: 869e816c7b00
  - path: source/react-charts/packages/charts/vitest.config.ts
    blob: 0ddfccd30b06
  - path: source/react-ui/packages/icons/vitest.config.ts
    blob: b281c1c3cc6f
  - path: source/react-ui/packages/tokens/vitest.config.ts
    blob: 055b74b29290
  - path: source/react-ui/packages/telemetry/vitest.config.ts
    blob: 039bb98ec0c3
  - path: .lydite/components.yml
    blob: 5d78d1592e95
confidence: verified
---

Each package's `vitest.config.ts` sets statements, branches, functions and lines thresholds to 100
(`ui/vitest.config.ts:15-20`); excludes are test files, `vitest.setup.ts` and `bundle-check/**`
(`:14`). `grep -rnE "v8 ignore|istanbul ignore|c8 ignore" source` finds nothing, so an uncovered
branch is fixed with a test or by deleting the code, not a pragma.

lydite is separate: `.lydite/components.yml` maps one component per package, and no lydite threshold
is configured in-repo — `ci-orchestration.yml` runs the reusable lydite workflow and a `lydite-baseline`
job on push that records the baseline the PR gate compares against. The only inline marker is
`[lydite:exclude_from_mutation][reason]` (`ZoomLayer.tsx:83`, `formatters.ts:15`), a mutation
exemption with a mandatory reason, not a coverage one.
