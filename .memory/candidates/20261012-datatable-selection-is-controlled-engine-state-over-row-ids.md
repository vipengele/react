---
about: DataTable's selection is a list of row ids held by the component and fed to the engine as controlled state, so it persists across sorts and unknown ids survive
saw:
  - source/react-ui/packages/ui/src/DataTable/DataTable.tsx
  - source/react-ui/packages/ui/src/DataTable/types.ts
---
- Selection state is the package's own list of row ids (`selectedRowIds`, controllable and uncontrollable through
  `useControllableState`), converted to the engine's record and passed only as `state.rowSelection`. The engine's own
  selection state is never read back; `onRowSelectionChange` computes the next ids and calls the setter.
- `selectsExactly` suppresses a change that leaves the same rows selected, so `onSelectionChange` fires only when the set
  changes.
- Ids are row ids from `getRowId`, not positions. The default (the row's index in `rows`) is unstable across sorts and
  reorders, so a selectable table should supply `getRowId`. Ids that name no drawn row are kept, which is how selection
  persists across sorts and, once a table pages, across pages.
- The select-all checkbox covers the rows currently drawn. Shift range selection is DataTable's own: `anchorRef` holds the
  last toggled row and the state it was given, and the range runs over the drawn rows in their displayed order.
- Rows carry no `aria-selected` (they are not focusable); the checked state of the row's checkbox or radio is what
  assistive technology reads. The rowSelectionFeature is added to the module-scope feature set alongside sorting.
