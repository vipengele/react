---
about: a record lists integer-like keys in ascending numeric order, so DataTable takes newly selected ids from the drawn rows, not from the engine's selection record
saw:
  - source/react-ui/packages/ui/src/DataTable/useSelectionState.ts
  - source/react-ui/packages/ui/src/DataTable/DataTable.tsx
  - source/react-ui/packages/ui/src/DataTable/types.ts
  - source/react-ui/packages/ui/src/DataTable/DataTable.test.tsx
---
The engine holds row selection as a record of selected ids. `Object.keys` on a record always lists integer-like keys in
ascending numeric order whatever order they were added in. The default row ids are `"0"`, `"1"`, … (`defaultRowId` in
`DataTable.tsx`, used when `getRowId` is omitted) and any `getRowId` returning numeric strings is the same, so reading
`Object.keys(next)` for the newly selected ids would report them in id order. On a sorted table that is not the drawn
order that `onSelectionChange`'s doc in `types.ts` promises.

`nextSelection(selection, drawnIds, updater)` in `useSelectionState.ts` therefore reports ids still selected first, in
their existing order, then newly selected ids in drawn-row order, then any newly selected id that names no drawn row. The
tests that catch it use numeric-string ids on a table sorted so drawn order differs from id order (`DataTable.test.tsx`,
the order of reported ids); tests with non-numeric ids such as names cannot see the defect.
