---
name: test-task-depends-on-own-build
kind: rationale
description: turbo's test task must depend on the package's own build, because bundle-check tests read dist/.
anchors:
  - path: turbo.json
    blob: 2530c7a6a4fc
  - path: packages/ui/bundle-check/entry.js
    blob: 30800fe4747a
  - path: packages/icons/bundle-check/entry.js
    blob: 248808cb70a3
confidence: verified
---

`turbo.json:17-18` gives `test` `dependsOn: ["^build", "build"]`, not just `["^build"]`.
Upstream-only looks like enough, because unit tests import from `./src`. It is not enough.
Both `packages/ui/package.json:32` and `packages/icons/package.json:32` run
`node bundle-check/run.mjs` after vitest. That script bundles `bundle-check/entry.js`, which
imports the package's own built output (`packages/ui/bundle-check/entry.js:4`,
`export { Button } from "../dist/index.js"`).

If `build` is dropped from `test`'s `dependsOn`, `pnpm test` fails on a clean checkout because
`dist/` is missing. `pnpm build && pnpm test` still passes, which hides the regression. CI
relies on this edge: `.github/workflows/ci-test.yml:48-51` runs `pnpm test` with no build step
before it.
