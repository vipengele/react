---
about: a virtualized Tree renders its own role=tree scroll container inside VirtualizedTree, because a container rendered by the parent is not attached when the virtualizer reads it on mount; focus on an unmounted row goes through scrollToIndex plus a pending-focus layout effect
saw:
  - source/react-ui/packages/ui/src/Tree/Tree.tsx
  - source/react-ui/packages/ui/src/Tree/Tree.browser.test.tsx
  - docs/adr/0025-tanstack-react-virtual-for-opt-in-tree-windowing.md
---

- `VirtualizedTree` (`Tree.tsx:186`) renders the `role="tree"` element itself and passes its ref to
  `useVirtualizer`'s `getScrollElement`. React attaches a parent's ref after its children's layout
  effects, so a scroll container rendered by `Tree` is still null when the virtualizer looks for it
  on mount and the first window never renders. It reproduces only in a real browser: jsdom has no
  layout, so a virtualized tree under jsdom mounts no rows.
- The tabbable row is added to the range by `rangeExtractor` (`Tree.tsx:188`), so it is always
  mounted. `focusElement` (`:380`) calls `scrollToIndexRef` first and, when the target row is not
  mounted yet, records it in `pendingFocusRef` (`:293`); a dependency-less layout effect focuses it
  on the next commit. It works because the row it is headed for is by then the tabbable one. No
  timers or rAF.
- Because virtualized branches are unreachable under jsdom, they are covered only by
  `Tree.browser.test.tsx`; the 100% threshold is met by the union of the two vitest projects.
