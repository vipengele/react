---
name: breadcrumbs-forwards-href-to-link-as
kind: gotcha
description: Breadcrumbs always passes each linked item's href to the linkAs component alongside linkProps, so a router link must apply its own destination after spreading rest props or the raw href overwrites it.
anchors:
  - path: source/react-ui/packages/ui/src/Breadcrumbs/Breadcrumbs.tsx
    blob: fce79b13a969
  - path: source/react-ui/packages/ui/src/Breadcrumbs/Breadcrumbs.test.tsx
    blob: e63b2b6b9712
confidence: verified
---

`Breadcrumbs.tsx:147-153`: an item without `href` renders as text, so `href` is what makes a step a link; a linked step
renders `TrailLink` (`Link`, `:58`) with `href={item.href}` next to `linkProps`. `Link` spreads rest onto the `as`
component, so a router link receives the raw `href` as well as its own prop. One written as
`<a href={computed} {...rest}>` has its computed href replaced. `Breadcrumbs.test.tsx` fixtures spread
`{...rest}` first. Dropping `href` when `linkAs` is set was rejected: "is this a link" would then depend on
the shape of an arbitrary component's props.
