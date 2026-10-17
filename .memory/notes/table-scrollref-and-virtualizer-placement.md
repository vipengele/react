---
name: table-scrollref-and-virtualizer-placement
kind: gotcha
description: Table forwards scrollRef to its scroll wrapper, and a composing component that virtualizes must call the virtualizer hook in the component that renders Table, not in a child inside it, or the wrapper is unattached on first read.
anchors:
  - path: source/react-ui/packages/ui/src/Table/Table.tsx
    blob: 5972c51673a9
  - path: source/react-ui/packages/ui/src/DataTable/DataTable.tsx
    blob: 7315ea2c1173
  - path: docs/adr/0027-table-density-scroll-region-and-sticky-layer.md
    blob: 79e53323fdaf
confidence: suspect
---

`TableProps.scrollRef` (`Table.tsx`) is attached to the `.vpg-table-container` div; `className` and `style` still go to that div,
while `ref` and the remaining props go to the `<table>`. `scrollRef` is destructured out before the rest spread.

Tree's lesson ([[virtualized-tree-owns-its-scroll-container]]) is that a container rendered by the parent is still unattached when a
child's mount layout effect reads it. `Table` renders the wrapper, so a component that renders `Table` can call `useVirtualizer`
itself and read the ref it passed as `scrollRef`; `DataTable.tsx` does, forwarding to the consumer's own `scrollRef`. A child
rendered inside `Table`'s children that calls the hook has the wrapper as an ancestor and sees it unattached on first read. Only a
Chromium test shows that, because jsdom's `ResizeObserver` is a stub.

`stickyHeader` and windowing need a bounded wrapper height supplied through `className` or `style`. Table has no `aria-sort`
support, spacer rows or non-table display mode (ADR-0027); a windowed DataTable's spacer rows are `DataTableBody`'s own. The wrapper
is a focusable region when `caption` or `aria-label` is passed, which keeps a virtualized scroll container keyboard-reachable.
