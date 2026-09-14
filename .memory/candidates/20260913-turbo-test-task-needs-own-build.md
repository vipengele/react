---
about: turbo.json's test task must depend on each package's own build, not only upstream builds
saw: turbo.json, packages/icons/bundle-check/run.mjs
---

`turbo.json`'s `test` task depends on `["^build", "build"]` — both the upstream-only `^build`
(other workspace packages this one depends on) and the package's own `build`. Depending on only
`^build` looks reasonable (test files import from `./src`, not `./dist`) but breaks any package
whose test suite also exercises its own built output — `packages/icons`' `test` script runs
`bundle-check/run.mjs` after vitest, which imports `../dist/index.js` to prove tree-shaking
end-to-end against the real build artifact, not the source. Without `build` in `test`'s own
`dependsOn`, `pnpm test` (or `turbo run test`) run alone on a clean checkout fails with a
missing-module error, while `pnpm build && pnpm test` run in sequence masks it by building
first anyway.

If a future package's test suite needs its own `dist/` (a bundle-check, an integration test
against the published entry point, etc.), this dependency is already in place — no `turbo.json`
change needed. If `test`'s `dependsOn` is ever narrowed back to `["^build"]` alone, this class
of package will silently regress the same way.
