---
about: Table gives a composing component no ref to its scroll wrapper, and sets no layout for windowed rows; DataTable virtualization must solve both
saw:
  - source/react-ui/packages/ui/src/Table/Table.tsx
  - docs/adr/0027-table-density-scroll-region-and-sticky-layer.md
  - source/react-ui/packages/ui/src/Tree/Tree.tsx
---
Table.tsx TableImpl: `className`/`style` go to the wrapper div, but `ref` and rest props go to the <table>
(ADR 0027); the wrapper has no ref. A react-virtual `getScrollElement` therefore has to reach the wrapper some other
way (e.g. a change to Table, or DataTable rendering its own wrapper). Note the Tree lesson
[[virtualized-tree-owns-its-scroll-container]]: the scroll element must be attached when the virtualizer reads it on mount.
Subcomponents Table.Head/Body/Foot/Row/HeaderCell/Cell all take native props incl. ref (React 19 ref prop) and className;
HeaderCell defaults scope="col"; cell alignment is per-cell `align`; density and stickyHeader are Table props.
stickyHeader only works with a bounded wrapper height. Nothing in Table supports aria-sort, spacer rows or non-table
display; those are DataTable's to add (<tr> windowing is expressly open in ADR 0046). Not run: no prototype was built.
