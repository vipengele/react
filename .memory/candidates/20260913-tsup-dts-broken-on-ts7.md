---
about: tsup's --dts flag against this repo's pinned typescript@7.0.2
saw: packages/tokens/tsconfig.build.json, packages/tokens/package.json build script
---

tsup's built-in `.d.ts` generation (`tsup --dts`, via `rollup-plugin-dts`) throws
`TypeError: Cannot read properties of undefined (reading 'useCaseSensitiveFileNames')` against
this repo's pinned `typescript@7.0.2` (root `package.json`). Every publishable package here
works around it the same way: `tsup` builds JS only (`dts: false` in `tsup.config.ts`), and a
separate `tsc -p tsconfig.build.json` (declaration-only tsconfig, `noEmit: false`,
`emitDeclarationOnly: true`) generates the `.d.ts` output. See `packages/tokens/package.json`'s
`build` script (`tsup && tsc -p tsconfig.build.json`) for the pattern; `packages/icons` repeats
it verbatim. The root `tsconfig.base.json` carries this as a load-bearing comment at its top.

Any new publishable package added to this monorepo should copy this split rather than trying
`tsup --dts` fresh — it will fail the same way until either tsup or typescript changes.
