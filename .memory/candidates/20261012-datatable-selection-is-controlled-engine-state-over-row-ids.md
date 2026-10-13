---
about: DataTable's selection is a list of row ids held by the component and fed to the engine as controlled state, so it persists across sorts and pages and unknown ids survive
saw:
  - source/react-ui/packages/ui/src/DataTable/useSelectionState.ts
  - source/react-ui/packages/ui/src/DataTable/DataTable.tsx
  - source/react-ui/packages/ui/src/DataTable/types.ts
---
- Selection state is the package's own list of row ids (`selectedRowIds`, controllable and uncontrollable through
  `useControllableState`), converted to the engine's record by `engineSelectionOf` and passed only as
  `state.rowSelection`. The engine's own selection state is never read back; `onRowSelectionChange` computes the next ids
  and calls the setter.
- `selectsExactly` suppresses a change that leaves the same rows selected, so `onSelectionChange` fires only when the set
  changes.
- Ids are row ids from `getRowId`, not positions. The default (`defaultRowId` in `DataTable.tsx`: the row's index in
  `rows`) is unstable across sorts and reorders, so a selectable table should supply `getRowId`. Ids that name no drawn
  row are kept, which is how selection persists across sorts and across pages of a `paginated` table.
- The select-all checkbox and Shift range selection cover the rows currently drawn, which are the current page's in a
  `paginated` table. Range selection is DataTable's own: `anchorRef` holds the last toggled row and the state it was
  given. It is not cleared on a page change (that would need an effect); an anchor naming a row that is not drawn falls
  back to toggling the one row.
- Rows carry no `aria-selected` (they are not focusable); the checked state of the row's checkbox or radio is what
  assistive technology reads.
