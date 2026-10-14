---
about: Table forwards a ref to its scroll wrapper through scrollRef, and a composing component that virtualizes must call the hook in an ancestor of that wrapper's owner
saw:
  - source/react-ui/packages/ui/src/Table/Table.tsx
  - docs/adr/0027-table-density-scroll-region-and-sticky-layer.md
  - source/react-ui/packages/ui/src/Tree/Tree.tsx
---
`TableProps.scrollRef` (`Table.tsx`) is attached to the `.vpg-table-container` div. `className` and `style` still go to
that div; `ref` and the remaining props still go to the `<table>`. `scrollRef` is destructured out before the rest
spread, so it never reaches the `<table>`.

`DataTable.tsx` is that component: it passes a callback ref as `scrollRef` (kept in a local ref and forwarded to the
consumer's own `scrollRef`) and calls `useVirtualizer` with `getScrollElement` reading it. The window renders on mount
without a re-render.

Placement constraint for a virtualizer built on it: Tree's lesson (`virtualized-tree-owns-its-scroll-container`) is that a
container rendered by the parent is still unattached when a child's mount layout effect reads it. `Table` is the child
that renders the wrapper, so a component that renders `Table` can safely call `useVirtualizer` itself, reading the ref it
passed as `scrollRef`. A child component rendered inside `Table`'s children that calls the hook would have the wrapper as
an ancestor and see it unattached on first read, and only a Chromium test shows that, because jsdom's `ResizeObserver` is
a stub.

Table still has no `aria-sort` support, no spacer rows and no non-table display mode (ADR-0027); `stickyHeader` and any
windowing need a bounded wrapper height supplied through `className` or `style`. The spacer rows of a windowed
DataTable are `DataTableBody`'s own.

The wrapper is a focusable region when `caption` or `aria-label` is passed (caption wins; `aria-label` also stays on the
`<table>`), which is what makes a virtualized table's scroll container keyboard-reachable.
