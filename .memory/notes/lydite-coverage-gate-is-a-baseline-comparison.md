---
name: lydite-coverage-gate-is-a-baseline-comparison
kind: gotcha
description: The lydite PR coverage gate compares each component to the default-branch baseline inside an external reusable workflow this repo cannot read, so lowering a vitest threshold does not loosen it.
anchors:
  - path: .github/workflows/ci-orchestration.yml
    blob: f09c5de0d2ee
  - path: .lydite/components.yml
    blob: 5d78d1592e95
  - path: .lydite/config.yml
    blob: f81c45f71c57
confidence: suspect
---

Read from the repo: job `lydite` in `ci-orchestration.yml` calls `pedromvgomes/gt/.github/workflows/reusable-lydite.yml@v2`
(`:160`) and `ci-gate` depends on it (`:193`); job `lydite-baseline` calls `reusable-lydite-baseline.yml@v2` (`:181`).
`.lydite/components.yml` only maps packages to runners, and `.lydite/config.yml` has just a `licence.policy` block: no
`coverage.tolerance`, `coverage.floor` or `coverage.patch.tolerance` is set in this repo.

From the installed `lydite` binary, not re-run in this pass: `lydite test --gate-coverage` compares each component to the
baseline for the merge-base and reports `baseline N%, below it by M%`.

Not known, because the workflow lives in another repository: whether it passes `--gate-coverage`, the default tolerance,
what `floor` does, and whether a deliberate drop can be accepted. So a change that lowers `ui` coverage below the `main`
baseline may fail `lydite` and so `ci-gate`, whatever `packages/ui/vitest.config.ts` allows (see
[[coverage-is-100-percent-with-no-ignore-pragmas]]).
