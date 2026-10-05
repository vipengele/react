---
about: Breadcrumbs always hands each linked item's `href` to the `linkAs` component alongside `linkProps`, so a router link must apply its own computed destination after spreading rest props or the raw href overwrites it
saw:
  - source/react-ui/packages/ui/src/Breadcrumbs/Breadcrumbs.tsx
  - source/react-ui/packages/ui/src/Breadcrumbs/Breadcrumbs.test.tsx
  - source/react-ui/packages/ui/src/Link/Link.tsx
  - source/react-ui/packages/ui/README.md
---

- In `Breadcrumbs.tsx`, `renderItem` renders `TrailLink` with `{...item.linkProps}`, `as={linkAs}` and `href={item.href}`; an item without `href` is plain text, so `href` is also what makes an item a link. `Link` spreads `...rest` onto the `as` component, so the router component receives `href` as well as its own prop (`to`).
- A router link written `<a href={computed} {...rest}>` has its computed href replaced by the raw one. `Breadcrumbs.test.tsx` fixtures spread `{...rest}` first and assert the rendered `#/home`; the README's `### Breadcrumbs` section states the same requirement.
- Dropping `href` when `linkAs` is set was rejected: it would make "is this a link" depend on `linkProps` shape, which cannot be inspected for an arbitrary router component.
