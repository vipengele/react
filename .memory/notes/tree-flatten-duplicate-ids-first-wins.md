---
name: tree-flatten-duplicate-ids-first-wins
kind: gotcha
description: Tree's flatten() keeps the first visible occurrence of an id and drops later ones with their subtrees, so which node wins a duplicate id changes with expansion.
anchors:
  - path: source/react-ui/packages/ui/src/Tree/flatten.ts
    blob: da86d3034a4f
  - path: source/react-ui/packages/ui/src/Tree/Tree.tsx
    blob: b1dac9ae20e9
confidence: verified
---

`flatten.ts:66` creates a `seen` set; `:79-80` skips a node whose id was already emitted, together with
its whole subtree. The walk only visits visible rows, so if an expanded parent P contains X and X also
appears later at the root, X shows under P while P is open and at the root once P collapses. Skipped
nodes do not count in their siblings' `setSize`/`posInSet`; the skip also stops a node that is its own
descendant from looping. Focus recovery in `Tree.tsx` works from the resulting rows, so it follows
whichever row currently wins. Ids inside a dropped subtree are never shown: consumers must keep ids
unique across the whole tree.
