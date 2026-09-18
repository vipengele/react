---
name: tests-read-source-via-import-meta-glob-not-node-fs
kind: gotcha
description: No workspace depends on @types/node, so a test that reads files must use Vite's import.meta.glob ?raw, not node:fs.
anchors:
  - path: package.json
    blob: 9f99fbb71d5b
  - path: packages/*/package.json
    matches:
      - path: packages/brand/package.json
        blob: affb1d0dfe45
      - path: packages/icons/package.json
        blob: 5e434ea58838
      - path: packages/tokens/package.json
        blob: 5c172144624e
      - path: packages/ui/package.json
        blob: 418cf46469e4
  - path: apps/*/package.json
    matches:
      - path: apps/storybook/package.json
        blob: 3955cecb4f98
  - path: tsconfig.base.json
    blob: 26da2af7d9d2
  - path: packages/ui/src/no-fallback-var-reads.test.ts
    blob: 73b3fd98b455
confidence: verified
---

`@types/node` appears in no `package.json` in the repo (root, `packages/*`, `apps/*`), and
`tsconfig.base.json:6-24` sets no `types` that would bring Node's in. Package tsconfigs include
`src`, so test files are type-checked (`packages/ui/tsconfig.json:3`). A test that imports
`node:fs`, `node:path` or `node:url` can run under vitest and still fail `pnpm type-check`, because
nothing declares those modules. No source under `packages/*/src` imports a `node:` builtin today.

The working pattern is `packages/ui/src/no-fallback-var-reads.test.ts:1,17-21`: a
`/// <reference types="vite/client" />` line, then `import.meta.glob([...], { eager: true, query:
"?raw", import: "default" })` to get every matching file's contents keyed by path. Vite ships with
vitest, so this needs no new dependency and no config change, and the glob picks up files added
later.

Adding `@types/node` to make a `node:fs` test type-check is the wrong direction: it adds a
dependency to work around a facility vitest already provides. See
[[ui-token-reads-carry-no-fallback]] for the test that uses it.
