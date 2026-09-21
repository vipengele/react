---
name: tests-read-source-via-import-meta-glob-not-node-fs
kind: gotcha
description: No workspace depends on @types/node, so a test that reads files must use Vite's import.meta.glob ?raw, not node:fs.
anchors:
  - path: source/react-ui/package.json
    blob: 7325023efcae
  - path: source/react-ui/packages/*/package.json
    matches:
      - path: source/react-ui/packages/icons/package.json
        blob: f73864c454d1
      - path: source/react-ui/packages/tokens/package.json
        blob: 359b1f2b7ac1
      - path: source/react-ui/packages/ui/package.json
        blob: a63d2284f109
  - path: source/react-ui/apps/*/package.json
    matches:
      - path: source/react-ui/apps/storybook/package.json
        blob: 3e9e4009a6ca
  - path: source/react-ui/tsconfig.base.json
    blob: 26da2af7d9d2
  - path: source/react-ui/packages/ui/src/no-fallback-var-reads.test.ts
    blob: 5f097f26581d
confidence: verified
---

`@types/node` appears in no `package.json` under `source/react-ui` (root, `packages/*`,
`apps/*`), and `source/react-ui/tsconfig.base.json:6-24` sets no `types` that would bring Node's
in. Package tsconfigs include `src`, so test files are type-checked
(`source/react-ui/packages/ui/tsconfig.json:3`). A test that imports `node:fs`, `node:path` or
`node:url` can run under vitest and still fail `pnpm type-check`, because nothing declares those
modules. No source under `packages/*/src` imports a `node:` builtin today; the only `node:`
imports are in `packages/ui/bundle-check/run.mjs`, which is plain JS outside `src`.

The working pattern is `source/react-ui/packages/ui/src/no-fallback-var-reads.test.ts:1,17-21`: a
`/// <reference types="vite/client" />` line, then `import.meta.glob([...], { eager: true, query:
"?raw", import: "default" })` to get every matching file's contents keyed by path. Vite ships with
vitest, so this needs no new dependency and no config change, and the glob picks up files added
later.

Adding `@types/node` to make a `node:fs` test type-check is the wrong direction: it adds a
dependency to work around a facility vitest already provides. See
[[ui-token-reads-carry-no-fallback]] for the test that uses it.
