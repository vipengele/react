---
name: bundle-check-floating-ui-markers-lack-positive-control
kind: gotcha
description: bundle-check only asserts floating-ui markers are absent; nothing committed proves they appear when floating-ui is bundled.
anchors:
  - path: source/react-ui/packages/ui/bundle-check/run.mjs
    blob: 74827b1e6569
confidence: suspect
---

`source/react-ui/packages/ui/bundle-check/run.mjs:86-89` checks that a bundle importing only
Button leaks no `@floating-ui/react`, by asserting that two strings are absent: `data-floating-ui`
and `computePosition` (comment `:80-85`). A check that only tests for absence proves nothing
unless the marker is known to appear when the dependency is bundled.

- Button and Spinner have that proof. `run.mjs:42` asserts `.vpg-button {` is present, and
  `run.mjs:46` asserts `@keyframes vpg-spinner-rotate` is present.
- The floating-ui markers do not. The bundle is unminified (`run.mjs:25`), and no committed
  bundle imports Tooltip or Popover to show the two strings appear (`bundle-check/entry.js:4`
  exports Button alone).
- The explorer reports checking this once with a throwaway bundle that imported Tooltip. That
  bundle is not in the repo, so this note is `suspect`.
- If a floating-ui upgrade renames either string, the check keeps passing even if the dependency
  leaks.

Dead end: an export name is not a usable marker. The explorer first tried `FloatingFocusManager`,
and it proved nothing: a bundle that imported Tooltip tree-shook it away even though floating-ui
was present. (It is used by `Popover.tsx:131` and, non-modally, by `Dropdown`'s search mode —
[[listbox-reference-is-the-control-not-the-field]].) A marker for any new third-party dependency
must be a string that the dependency's own runtime code emits, checked against a bundle that does
include the dependency.
