---
about: the lydite PR coverage gate compares each component to the default-branch baseline and lives in an external reusable workflow this repo cannot read
saw:
  - .github/workflows/ci-orchestration.yml
  - .lydite/components.yml
  - .lydite/config.yml
  - docs/adr/0048-ui-coverage-gate-is-80-percent.md
---
Known from the repo and the installed `lydite` binary:

- `ci-orchestration.yml` job `lydite` calls `pedromvgomes/gt/.github/workflows/reusable-lydite.yml@v2`; `ci-gate`
  fails when that job's result is `failure`. The `lydite-baseline` job records the merged tree's coverage on every push
  to the default branch.
- `lydite test --gate-coverage` compares each `.lydite/components.yml` component against the baseline for the
  merge-base and reports `baseline N%, below it by M%`. `.lydite/config.yml` accepts optional `coverage.tolerance`,
  `coverage.floor` and `coverage.patch.tolerance`; this repo sets none.
- `.lydite/components.yml` carries no threshold; it only maps packages to runners.

Not known, because the workflow is unreadable from a session without access to that repository: whether the workflow
passes `--gate-coverage`, the default tolerance, what `floor` does, and whether a person can accept a deliberate drop.
Lowering `packages/ui/vitest.config.ts` to 80% does nothing to this gate; a change that lowers `ui` coverage below the
main baseline may fail `lydite` and so `ci-gate` regardless of the vitest threshold.
