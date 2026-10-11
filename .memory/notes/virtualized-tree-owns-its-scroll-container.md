---
name: virtualized-tree-owns-its-scroll-container
kind: gotcha
description: A virtualized Tree renders its own role=tree scroll container inside VirtualizedTree, because a container rendered by the parent is not attached when the virtualizer reads it on mount.
anchors:
  - path: source/react-ui/packages/ui/src/Tree/Tree.tsx
    blob: b1dac9ae20e9
  - path: source/react-ui/packages/ui/src/Tree/Tree.browser.test.tsx
    blob: 0f7cd0569bd6
confidence: verified
---

`VirtualizedTree` (`Tree.tsx:147`) renders the tree element itself and its ref feeds `getScrollElement` (`:164`;
doc `:204`). React attaches a parent's ref after its children's layout effects, so a container rendered by `Tree`
is still null when the virtualizer looks on mount and the first window never renders. It reproduces only in a
real browser: jsdom has no layout, so virtualized branches are covered by `Tree.browser.test.tsx` alone and the
100% gate is met by the union of both vitest projects. Focus on an unmounted row goes through
`scrollToIndexRef` plus a pending-focus layout effect, with no timers.
