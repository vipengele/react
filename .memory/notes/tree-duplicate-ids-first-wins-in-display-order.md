---
name: tree-duplicate-ids-first-wins-in-display-order
kind: gotcha
description: flatten() keeps the first occurrence of an id in display order and drops later ones with their subtrees, so which node wins a duplicate id depends on what is expanded.
anchors:
  - path: source/react-ui/packages/ui/src/Tree/flatten.ts
    blob: da86d3034a4f
  - path: source/react-ui/packages/ui/src/Tree/flatten.test.ts
    blob: c8298d336019
confidence: verified
---

- `flatten.ts:66-80` keeps a `seen` set while walking pre-order: a node whose id was already
  emitted is skipped (`:79`) together with its whole subtree, and it does not count towards its
  siblings' `setSize` / `posInSet`. That also stops a node that is its own descendant from
  looping.
- The walk visits only visible rows (doc comment `:60-62`), so the winner changes with
  expansion: if an expanded parent P contains X and X also appears later at the root, X shows
  under P while P is open and at the root when P is collapsed. Focus recovery (`recover`,
  `Tree/navigation.ts:32`) works from the resulting rows, so it follows whichever row currently
  wins.
- Ids that appear only inside a dropped subtree are never shown. Consumers must keep ids unique
  across the whole tree (the `getId` doc says so).
