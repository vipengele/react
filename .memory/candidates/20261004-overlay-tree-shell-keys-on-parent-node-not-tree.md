---
about: OverlayTreeShell decides whether to create a FloatingTree from useFloatingParentNodeId(), not from whether a tree exists, so an overlay outside any node starts its own tree
saw:
  - source/react-ui/packages/ui/src/internal/overlayTree.tsx
  - source/react-ui/packages/ui/src/Dropdown/Dropdown.tsx
  - source/react-ui/packages/ui/src/Tooltip/Tooltip.tsx
---
`OverlayTreeShell` (`overlayTree.tsx`) renders a `<FloatingTree>` only when
`useFloatingParentNodeId()` is null. That id comes from the nearest `FloatingNode` context and says
nothing about whether a tree exists above. Consequences, verified against @floating-ui/react 0.27:

- A Tooltip in a Dropdown's chip row ("and N more") sits in the field, outside the listbox's
  `FloatingNode`, so it starts its own tree even though the Dropdown's tree is above it. Inside a
  Popover panel it joins the Popover's tree.
- A consumer-rendered `FloatingTree` with no node above our overlay is shadowed by a nested second
  tree; a consumer `FloatingNode` with no tree leaves the overlay in no tree.

Keying on `useFloatingTree() === null` would fix the first case but not the second. Wrap only the
floating element in `node(...)`, never the trigger: the trigger belongs to the enclosing node.
