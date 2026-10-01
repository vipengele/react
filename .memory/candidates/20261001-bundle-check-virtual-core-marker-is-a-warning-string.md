---
about: the bundle-check proves @tanstack/virtual-core stays out of non-Tree bundles through a positive-control build of Tree and a marker that is the fixed text of a virtual-core warning, so it breaks if that wording changes
saw:
  - source/react-ui/packages/ui/bundle-check/run.mjs
  - source/react-ui/packages/ui/bundle-check/entry-tree.js
  - source/react-ui/packages/ui/.agents/rules/update-bundle-check-with-every-component.md
---

- `run.mjs` builds twice through `bundle(entryFile)` (`:21`): `entry.js` (Button only) and
  `entry-tree.js` (Tree only). `.vpg-tree {` is in `unrelatedComponents`, and
  `virtualCoreMarker` (`:134`) must be absent from the Button bundle and present in the Tree one.
- The marker is `"on measured element."`, the tail of virtual-core's `Missing attribute name '…'
  on measured element.` warning. It is a string literal, so it survives `minify: false` and is not a
  renameable identifier, and it is not behind a `NODE_ENV` guard (virtual-core's debug `key:`
  strings are). An absence-only marker would pass whether or not virtual-core is ever bundled; the
  Tree build is what makes the absence mean something.
- A virtual-core release that rewords that warning fails the positive control loudly; pick another
  unconditional string literal from its built `dist/esm/index.js`.
