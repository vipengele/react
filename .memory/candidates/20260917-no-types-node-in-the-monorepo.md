---
about: No workspace depends on @types/node, so a test cannot import node:fs to read source files.
saw: packages/ui/src/no-fallback-var-reads.test.ts, package.json
---

`@types/node` is not a dependency of the root `package.json` or of any workspace under
`packages/*` or `apps/*`. A test that reaches for `node:fs`, `node:path` or `node:url` compiles
locally against whatever ambient types happen to be installed and then fails `pnpm type-check`
with `Cannot find name 'node:fs'`.

A test that needs to read source files off disk uses Vite's `import.meta.glob` with
`query: "?raw"` instead — `packages/ui/src/no-fallback-var-reads.test.ts` does exactly this to
walk `packages/ui/src` and assert a pattern is absent from every file. It needs only a
`/// <reference types="vite/client" />` line, which resolves because `vite` is already present
in `packages/ui`'s `node_modules` as a transitive dependency of vitest. No package.json change
and no vitest config change is required.

Reaching for the Node builtins and then adding `@types/node` to fix the type error is the wrong
direction: it adds a dependency to work around a facility vitest already provides.
