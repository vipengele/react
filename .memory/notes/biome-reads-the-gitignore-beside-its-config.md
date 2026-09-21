---
name: biome-reads-the-gitignore-beside-its-config
kind: gotcha
description: Biome honours only the .gitignore beside its biome.json, so source/react-ui/.gitignore must repeat coverage/ and other generated paths the root .gitignore already lists.
anchors:
  - path: source/react-ui/biome.json
    blob: ecbaf663e8ac
  - path: source/react-ui/.gitignore
    blob: 1ca0fddbf640
  - path: .github/workflows/ci-build.yml
    blob: b51d8648165c
confidence: verified
---

`source/react-ui/biome.json:2-6` enables `vcs.useIgnoreFile: true`, and Biome reads the
`.gitignore` in the directory holding its config, not the repository root's. The project's
`.gitignore` says so and repeats `coverage/`, `node_modules/`, `*.tsbuildinfo` and `.vitest/`
(`source/react-ui/.gitignore:8-13`) even though the root `.gitignore` already covers them
(`.gitignore:22`, `:41`, `:48`, `:147`).

A test run writes `packages/*/coverage/` (lcov HTML, `coverage-summary.json`). Drop `coverage/`
from the project's `.gitignore` and a following `pnpm lint` or `pnpm format:check` fails on those
generated files.

CI does not catch the regression: `ci-build.yml:81-82` runs lint and format:check before anything
is tested, and the test job runs later in a separate job
(`.github/workflows/ci-orchestration.yml:113-114`), so no coverage exists when Biome runs. It only
shows up locally in `pnpm test && pnpm lint`.

Any new generated directory — and any new project under `source/` with its own `biome.json` —
needs its ignores in the `.gitignore` beside that config. Why Biome is the only linter and
formatter: `docs/adr/0010-biome-owns-formatting.md`.
