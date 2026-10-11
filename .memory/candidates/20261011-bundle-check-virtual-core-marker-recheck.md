---
about: virtual-core marker note still true; line pointers shifted by about 4
saw:
  - source/react-ui/packages/ui/bundle-check/run.mjs
targets: bundle-check-virtual-core-marker-is-a-warning-string
verdict: still-true
---
Re-read run.mjs. Marker `virtualCoreMarker = "on measured element."` is now at `:163` (note says `:159`),
absent-from-Button assertion `:164-167` (note `:161-162`), Tree positive control `:172-177` (note `:168-172`).
`minify: false` is at `:26` (note says `:27`). Claim itself holds: Tree bundle built from entry-tree.js asserts
presence, Button bundle asserts absence. I did not rebuild to confirm the string still appears in virtual-core output.
