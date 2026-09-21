---
name: test-task-depends-on-own-build
kind: rationale
description: turbo's test task must depend on the package's own build, because bundle-check tests read dist/.
anchors:
  - path: source/react-ui/turbo.json
    blob: 167dfa3be66e
  - path: source/react-ui/packages/ui/bundle-check/entry.js
    blob: 30800fe4747a
  - path: source/react-ui/packages/icons/bundle-check/entry.js
    blob: 248808cb70a3
  - path: .github/workflows/ci-test.yml
    blob: d0b0f11bb99b
confidence: verified
---

`source/react-ui/turbo.json:15` gives `test` `dependsOn: ["^build", "build"]`, not just
`["^build"]`. Upstream-only looks like enough, because unit tests import from `./src`. It is not
enough. Both `source/react-ui/packages/ui/package.json:33` and
`source/react-ui/packages/icons/package.json:33` run `node bundle-check/run.mjs` after vitest.
That script bundles `bundle-check/entry.js`, which imports the package's own built output
(`packages/ui/bundle-check/entry.js:4`, `export { Button } from "../dist/index.js"`;
`packages/icons/bundle-check/entry.js:4`, `export { ChevronDown } from "../dist/index.js"`).

If `build` is dropped from `test`'s `dependsOn`, `pnpm test` fails on a clean checkout because
`dist/` is missing. `pnpm build && pnpm test` still passes, which hides the regression. CI relies
on this edge: `.github/workflows/ci-test.yml:85` runs `pnpm test` with no build step before it
(comment ending `:84`).
