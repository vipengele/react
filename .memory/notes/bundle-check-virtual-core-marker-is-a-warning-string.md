---
name: bundle-check-virtual-core-marker-is-a-warning-string
kind: gotcha
description: bundle-check proves @tanstack/virtual-core is absent from non-Tree bundles through a Tree positive control and a marker that is the fixed text of a virtual-core warning, so a rewording breaks it.
anchors:
  - path: source/react-ui/packages/ui/bundle-check/run.mjs
    blob: b73e17609ea3
  - path: source/react-ui/packages/ui/bundle-check/entry-tree.js
    blob: 3a2dd07a9095
confidence: verified
---

`run.mjs:159` sets `virtualCoreMarker = "on measured element."`, the tail of a virtual-core warning
string. It is asserted absent from the Button bundle (`:161-162`) and present in the Tree-only bundle
built from `entry-tree.js` (`:168-172`); the Tree build is what makes the absence mean something. A
string literal survives `minify: false` (`:27`), unlike a renamed identifier. A virtual-core release
that rewords the warning fails the positive control loudly; pick another unconditional string literal
from its built output. Compare [[bundle-check-floating-ui-markers-lack-positive-control]], which has no such control.
