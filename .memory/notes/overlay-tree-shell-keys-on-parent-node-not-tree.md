---
name: overlay-tree-shell-keys-on-parent-node-not-tree
kind: gotcha
description: OverlayTreeShell decides whether to create a FloatingTree from useFloatingParentNodeId(), not from whether a tree exists, so an overlay outside any node starts its own tree.
anchors:
  - path: source/react-ui/packages/ui/src/internal/overlayTree.tsx
    blob: 7bb167ba4704
confidence: suspect
---

`overlayTree.tsx:25` reads `useFloatingParentNodeId()`, which comes from the nearest `FloatingNode`
context and says nothing about whether a `FloatingTree` exists above. The explorer reported
(against @floating-ui/react 0.27, not re-verified here) that a Tooltip in a Dropdown's chip row sits
outside the listbox's node and starts its own tree, a consumer `FloatingTree` with no node above our
overlay is shadowed by a second nested tree, and keying on `useFloatingTree() === null` fixes only the
first case. Wrap only the floating element in `node(...)`, never the trigger.
