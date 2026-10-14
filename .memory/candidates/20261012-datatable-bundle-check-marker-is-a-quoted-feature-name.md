---
about: the table-engine marker in bundle-check is a quoted string present in production builds, with a DataTable-only positive control
saw:
  - source/react-ui/packages/ui/bundle-check/run.mjs
  - source/react-ui/packages/ui/bundle-check/entry-data-table.js
  - source/react-ui/packages/ui/api-check/run.mjs
---
`bundle-check/run.mjs` asserts the engine stays out of bundles that do not import DataTable, using the marker
`'"coreRowModelsFeature"'`, quotes included. It is the feature name the engine's core row-model feature passes as a
string to `assignTableAPIs(...)` whenever a table is built, outside any `process.env.NODE_ENV` branch, so a minified
production build keeps it. The quotes keep the `coreRowModelsFeature` identifier, which a minifier may rename or keep,
from matching.

A development-only message such as the engine's "getRow could not find row with ID" is a poor marker: it is present in
an unminified bundle and disappears from a production one, so the absence assertion would pass vacuously.

`bundle-check/entry-data-table.js` is the positive control: its bundle must contain DataTable's stylesheet marker
(`.vpg-data-table-sort {`), Table's (`.vpg-table {`), the engine marker and the virtual-core marker
(`"on measured element."`, shared with Tree), so the absence from the Button bundle (and of the engine from the Tree
bundle) is a tree-shaking result. Measured when written: marker count 2 in the DataTable bundle, 0 in Button and Tree.

`api-check/run.mjs` walks the declarations reachable from `dist/index.d.ts` and fails on any `@tanstack/` specifier. It
has no exact-exports list (charts' version does), because ui's roughly sixty exports would make that list churn with
every component. It needs the same `biome-ignore lint/correctness/noNodejsModules` lines as `bundle-check/run.mjs`.
