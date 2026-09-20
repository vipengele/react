---
about: Biome ignores generated files only through the .gitignore beside its biome.json, so each project must carry the ignores itself
saw:
  - source/react-ui/biome.json
  - source/react-ui/.gitignore
---
`source/react-ui/biome.json` sets `vcs.useIgnoreFile: true`, and Biome reads the `.gitignore` in the directory that holds its config, not the repository root's. A test run writes `packages/*/coverage/` (lcov HTML, `coverage-summary.json`), and without `coverage/` in `source/react-ui/.gitignore` a following `pnpm lint` or `pnpm format:check` fails on those generated files. The project's `.gitignore` therefore repeats `coverage/`, `node_modules/`, `*.tsbuildinfo` and `.vitest/` even though the root `.gitignore` already lists them. CI lints before it tests, so the failure only shows in a local `pnpm test && pnpm lint`.
