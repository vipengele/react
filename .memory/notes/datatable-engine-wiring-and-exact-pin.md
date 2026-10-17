---
name: datatable-engine-wiring-and-exact-pin
kind: gotcha
description: DataTable drives the v9 table engine with a module-scope feature set and fully controlled state, maps null to undefined for sorting, and pins the engine to an exact version because of the 7-day minimumReleaseAge.
anchors:
  - path: source/react-ui/packages/ui/src/DataTable/DataTable.tsx
    blob: 7315ea2c1173
  - path: source/react-ui/packages/ui/src/DataTable/useSortState.ts
    blob: cca8b092e12e
  - path: source/react-ui/packages/ui/package.json
    blob: 8d0a93b68e25
  - path: source/react-ui/pnpm-workspace.yaml
    blob: 2be34c8620fe
  - path: docs/adr/0046-datatable-takes-tanstack-table-as-its-behaviour-engine.md
    blob: 0680abb537ad
confidence: suspect
---

`@tanstack/react-table` is v9 here and its API differs from v8; read the installed package's types, not memory.

- `DataTable.tsx` builds the feature set once at module scope with `tableFeatures({ rowSortingFeature, sortedRowModel,
  rowSelectionFeature, rowPaginationFeature, paginatedRowModel, columnSizingFeature })` because the engine needs a stable feature
  set; only features DataTable offers are registered (ADR-0046: no grouping, pinning or global filter).
- Sort, selection, page and column-size state each live in `useControllableState` (`useSortState.ts`, `useSelectionState.ts`,
  `usePaginationState.ts`, `useColumnSizing.ts`) and reach the engine only as controlled `state`, with `manualSorting` and
  `manualPagination` set from props. The package's own `DataTableSortState` (`{columnId, direction}[]`) is converted to the engine's
  `{id, desc}[]`; the engine's own state is never read back.
- The engine treats only `undefined` as missing, not `null`: the engine-side accessor maps `null` to `undefined` and columns set
  `sortUndefined: "last"`, so both sort last in either direction. `cell` renderers still receive `null`, and `sortFn` is never
  called with null or undefined.
- `ui/package.json:37` pins `@tanstack/react-table` to the exact `9.2.6`, not a caret: `minimumReleaseAge: 10080`
  (`pnpm-workspace.yaml:7`) excludes releases under 7 days old, and a caret range would float to a newer release the
  supply-chain gate rejects. Re-pin to the newest release older than the window.
- The public surface never mentions the engine; `api-check/run.mjs` enforces that on the emitted declarations.
