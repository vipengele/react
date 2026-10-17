---
name: module-level-compound-member-read-defeats-tree-shaking
kind: gotcha
description: A module-level read of a compound component's member (Menu.LinkItem) keeps Menu and floating-ui in every bundle that imports the reader; import the member from internal/menuPanel instead.
anchors:
  - path: source/react-ui/packages/ui/src/TopNav/TopNav.tsx
    blob: a234cf8ef7c2
  - path: source/react-ui/packages/ui/src/Menu/Menu.tsx
    blob: d2a440c99893
  - path: source/react-ui/packages/ui/bundle-check/run.mjs
    blob: 3ce90d18527a
confidence: verified
---

`const OverflowLink = Menu.LinkItem as ...` at module level in `TopNav.tsx` made `bundle-check/run.mjs` fail with "unrelated
component Menu leaked into a bundle that only imported Button": Rollup cannot prove a property read on an imported object is
side-effect free, so all of Menu and `@floating-ui/react` stayed. `TopNav.tsx:20` now imports `MenuLinkItem` and
`MenuLinkItemProps` from `internal/menuPanel.js`, the module `Menu.tsx:226` builds `Menu.LinkItem` from, and casts that name
(`TopNav.tsx:81`); `Menu` is referenced only inside `TopNavImpl`. The `/* @__PURE__ */ Object.assign` on the compound export is
what keeps the component itself shakeable, and the `unrelatedComponents` entry for TopNav in `bundle-check/run.mjs` is what
catches a regression.
