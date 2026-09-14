---
about: a compound component's `Object.assign(Impl, {...})` export needs a `/* @__PURE__ */` annotation or it defeats tree-shaking
saw: packages/ui/src/Card/Card.tsx, packages/ui/src/Tabs/Tabs.tsx, packages/ui/bundle-check/run.mjs
---

`export const Card = Object.assign(CardImpl, { Header, Content, Footer })` is a call expression.
Rollup/esbuild can't prove on their own that calling `Object.assign` has no side effect, so an
unused compound export (a bundle that imports only `Button`, say) keeps the whole module
reachable "just in case," and `bundle-check/run.mjs` fails with the compound component's own
marker leaking into a bundle that never imported it.

Fixed by annotating the call itself: `export const Card = /* @__PURE__ */ Object.assign(...)`.
This was first hit building `Card` (this package's first compound component) and confirmed again
on `Tabs` — every future compound component in `@tandiko/ui` needs the same annotation, and
`bundle-check/`'s own exclusion-list assertion is what actually catches a missing one.
