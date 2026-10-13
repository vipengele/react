---
about: how DataTable drives the v9 table engine, with a module-scope feature set, fully controlled state, null-to-undefined sorting, and why the dependency is an exact pin
saw:
  - source/react-ui/packages/ui/src/DataTable/DataTable.tsx
  - source/react-ui/packages/ui/src/DataTable/useSortState.ts
  - source/react-ui/packages/ui/src/DataTable/types.ts
  - source/react-ui/packages/ui/package.json
  - source/react-ui/pnpm-workspace.yaml
  - docs/adr/0046-datatable-takes-tanstack-table-as-its-behaviour-engine.md
---
`@tanstack/react-table` is v9 here, whose API differs from v8; read the installed package's types, not memory.

- `DataTable.tsx` builds the feature set once at module scope, `tableFeatures({ rowSortingFeature, sortedRowModel,
  rowSelectionFeature, rowPaginationFeature, paginatedRowModel })` (each row model from its `create*RowModel()`),
  because the engine needs a stable feature set; only features DataTable offers are registered (ADR-0046: no grouping,
  pinning or global filter).
- Sort, selection and page state each live in `useControllableState` (hooks in `useSortState.ts`, `useSelectionState.ts`,
  `usePaginationState.ts`) and reach the engine only as controlled `state`, with `manualSorting` and `manualPagination`
  set from the props. The package's own types (`DataTableSortState` is `{columnId, direction}[]`) are converted to the
  engine's shapes (`{id, desc}[]`); the engine's own state is never read back. Rows are cast to an internal record type
  because the engine constrains rows to records or arrays while `Row` is unconstrained.
- The engine treats only `undefined` as missing, not `null`. The engine-side accessor maps `null` to `undefined` and
  columns set `sortUndefined: "last"`, so null and undefined sort last in both directions. Cells read through the
  column's own reader, so a `cell` renderer still receives `null`. `sortFn` is never called with null or undefined.
- `package.json` pins `@tanstack/react-table` to an exact version, not a caret: `minimumReleaseAge: 10080` in
  `source/react-ui/pnpm-workspace.yaml` excludes releases under 7 days old, and a caret range would float to a newer
  release that the supply-chain gate rejects. Re-pin to the newest release older than the window.
- The public surface never mentions the engine; `api-check/run.mjs` enforces that on the emitted declarations.
