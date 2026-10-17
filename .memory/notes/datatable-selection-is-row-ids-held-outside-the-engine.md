---
name: datatable-selection-is-row-ids-held-outside-the-engine
kind: gotcha
description: DataTable selection is a list of row ids held by the component and fed to the engine as controlled state, so it survives sorts and pages and unknown ids are kept; newly selected ids are reported in drawn order, not the engine record's integer-key order.
anchors:
  - path: source/react-ui/packages/ui/src/DataTable/useSelectionState.ts
    blob: 8ff4d31cf430
  - path: source/react-ui/packages/ui/src/DataTable/DataTable.tsx
    blob: 7315ea2c1173
  - path: source/react-ui/packages/ui/src/DataTable/types.ts
    blob: 39684f310c7e
  - path: source/react-ui/packages/ui/src/DataTable/DataTable.test.tsx
    blob: af9a54015bb6
confidence: suspect
---

- Selection state is the package's own list of row ids (`selectedRowIds`, controllable via `useControllableState`), converted by
  `engineSelectionOf` and passed only as `state.rowSelection`; the engine's state is never read back. `selectsExactly` suppresses a
  change that leaves the same rows selected, so `onSelectionChange` fires only when the set changes.
- Ids are `getRowId` ids, not positions. The default (`defaultRowId` in `DataTable.tsx`, the row's index in `rows`) is unstable
  across sorts and reorders, so a selectable table should supply `getRowId`. Ids that name no drawn row are kept, which is how
  selection persists across sorts and across pages.
- The engine holds selection as a record, and `Object.keys` lists integer-like keys in ascending numeric order whatever order they
  were added in. Default ids are `"0"`, `"1"`, … and any numeric-string `getRowId` behaves the same, so reading `Object.keys(next)`
  would report newly selected ids in id order, not the drawn order `types.ts` promises on a sorted table. `nextSelection(selection,
  drawnIds, updater)` in `useSelectionState.ts` therefore reports still-selected ids first, then newly selected ids in drawn-row
  order, then newly selected ids that name no drawn row. Tests that catch it need numeric-string ids on a sorted table; tests with
  non-numeric ids such as names cannot see the defect.
- Select-all and Shift range selection cover the rows currently drawn (the current page's, when `paginated`). The Shift anchor
  (`anchorRef`) is not cleared on a page change; an anchor naming an undrawn row falls back to toggling one row.
- Rows carry no `aria-selected` (they are not focusable); the row checkbox or radio state is what assistive technology reads.
