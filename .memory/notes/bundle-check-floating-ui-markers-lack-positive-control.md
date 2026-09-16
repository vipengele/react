---
name: bundle-check-floating-ui-markers-lack-positive-control
kind: gotcha
description: bundle-check only asserts floating-ui markers are absent; nothing committed proves they appear when floating-ui is bundled.
anchors:
  - path: packages/ui/bundle-check/run.mjs
    blob: 43d449ef7b18
confidence: suspect
---

`packages/ui/bundle-check/run.mjs:93-99` checks that a bundle importing only Button leaks no
`@floating-ui/react`. It does this by asserting that two strings are absent:
`data-floating-ui` and `computePosition`. A check that only tests for absence proves nothing
unless the marker is known to appear when the dependency is bundled.

- The component markers have that proof. `run.mjs:42-45` asserts `.tandiko-button {` is present.
- The floating-ui markers do not. The bundle is unminified (`run.mjs:25`), and no committed
  bundle imports Tooltip or Popover to show the two strings appear.
- The explorer reports checking this once with a throwaway bundle that imported Tooltip. That
  bundle is not in the repo, so this note is `suspect`.
- If a floating-ui upgrade renames either string, the check keeps passing even if the
  dependency leaks.

Dead end: an export name is not a usable marker. The explorer first tried
`FloatingFocusManager`, and it proved nothing. Only Popover uses it
(`packages/ui/src/Popover/Popover.tsx:146`). A bundle that imported Tooltip tree-shook it away
even though floating-ui was present. A marker for any new third-party dependency must be a
string that the dependency's own runtime code emits. It must also be checked against a bundle
that does include the dependency.
