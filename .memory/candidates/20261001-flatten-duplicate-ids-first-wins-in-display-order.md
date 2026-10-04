---
about: flatten() keeps the first occurrence of an id in display order and drops later ones with their subtrees, so which node wins a duplicate id depends on what is expanded
saw:
  - source/react-ui/packages/ui/src/Tree/flatten.ts
  - source/react-ui/packages/ui/src/Tree/flatten.test.ts
  - source/react-ui/packages/ui/src/Tree/Tree.tsx
---

- `flatten.ts:79-80` uses a `seen` set while walking pre-order: a later node whose id was already
  emitted is skipped together with its whole subtree, and it does not count towards its siblings'
  `setSize` / `posInSet`. That also stops a node that is its own descendant from looping.
- The walk visits only visible rows, so the winner changes with expansion: if an expanded parent P
  contains X and X also appears later at the root, X shows under P while P is open and at the root
  when P is collapsed. `Tree`'s focus recovery (`recover`, `Tree.tsx:153`) works from the
  resulting rows and ancestors, so it follows whichever row currently wins.
- Ids that appear only inside a dropped subtree are never shown. Consumers must keep ids unique
  across the whole tree (the `getId` doc says so).
