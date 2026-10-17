---
name: datatable-bundle-check-marker-is-a-quoted-feature-name
kind: gotcha
description: The table-engine marker in ui's bundle-check is the quoted string "coreRowModelsFeature", present in production builds; a dev-only message would make the absence assertion pass vacuously.
anchors:
  - path: source/react-ui/packages/ui/bundle-check/run.mjs
    blob: 3ce90d18527a
  - path: source/react-ui/packages/ui/bundle-check/entry-data-table.js
    blob: 67b27afd4ee4
  - path: source/react-ui/packages/ui/api-check/run.mjs
    blob: 20bcafe43c3d
confidence: verified
---

`bundle-check/run.mjs:205` asserts the engine stays out of bundles that do not import DataTable, using the marker
`'"coreRowModelsFeature"'`, quotes included. It is the feature name the engine's core row-model feature passes as a string to
`assignTableAPIs(...)` whenever a table is built, outside any `process.env.NODE_ENV` branch, so a minified production build
keeps it; the quotes stop the identifier, which a minifier may rename, from matching. A development-only message such as the
engine's "getRow could not find row with ID" is a poor marker: it exists in an unminified bundle and vanishes from a production
one, so the absence assertion would pass vacuously.

`bundle-check/entry-data-table.js` is the positive control: its bundle must contain DataTable's stylesheet marker
(`.vpg-data-table-sort {`), Table's (`.vpg-table {`), the engine marker and the virtual-core marker (`"on measured element."`,
shared with Tree), so absence from the Button bundle (and of the engine from the Tree bundle) is a tree-shaking result.

`api-check/run.mjs` walks the declarations reachable from `dist/index.d.ts` and fails on any `@tanstack/` specifier. It has no
exact-exports list (charts' version does) because ui's roughly sixty exports would make it churn. It needs the same
`biome-ignore lint/correctness/noNodejsModules` lines as `bundle-check/run.mjs`.
