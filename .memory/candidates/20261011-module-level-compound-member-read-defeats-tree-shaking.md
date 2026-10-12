---
about: a module-level read of a compound component's member (`Menu.LinkItem`) keeps Menu and floating-ui in every bundle; import the member from internal/menuPanel instead
saw:
  - source/react-ui/packages/ui/src/TopNav/TopNav.tsx
  - source/react-ui/packages/ui/src/Menu/Menu.tsx
  - source/react-ui/packages/ui/bundle-check/run.mjs
---
`const OverflowLink = Menu.LinkItem as ...` at module level in `TopNav.tsx` made `bundle-check/run.mjs` fail with
"unrelated component Menu leaked into a bundle that only imported Button": Rollup cannot prove a property read on an
imported object side-effect free, so the whole of Menu and `@floating-ui/react` stayed. `TopNav.tsx` now imports
`MenuLinkItem` and `MenuLinkItemProps` from `internal/menuPanel.js` (the module `Menu.tsx` builds `Menu.LinkItem` from,
`Menu.tsx:226`) and casts that name, with `Menu` referenced only inside `TopNavImpl`. The `/* @__PURE__ */
Object.assign` on the compound export is what keeps the component itself shakeable; the bundle-check `unrelatedComponents`
entry for TopNav (`run.mjs`) is what catches a regression.
