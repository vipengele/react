---
about: the repo's established way to let a component render as / compose with a foreign element is a generic `as` prop (polymorphic component), not Slot/asChild or cloneElement
saw:
  - source/react-ui/packages/ui/src/Typography/Typography.tsx
  - source/react-ui/packages/ui/package.json
  - source/react-ui/packages/ui/.agents/rules/wrap-trigger-never-clone.md
---

No ADR states this directly, and no dependency (Radix, `@radix-ui/react-slot`) is present in
`source/react-ui/packages/ui/package.json` — the only runtime deps are `@floating-ui/react` and
`@vipengele/react-icons`, and ADR-0002 gates adding another dependency beyond floating-ui.

The precedent instead lives in `Typography`:

```ts
export type TypographyProps<C extends ElementType = "p"> = TypographyOwnProps & {
  as?: C;
} & Omit<ComponentPropsWithoutRef<C>, keyof TypographyOwnProps | "as">;
```

(`source/react-ui/packages/ui/src/Typography/Typography.tsx:39-41`) — a generic `as` prop typed
against `ElementType`, defaulting per-variant (`VARIANT_ELEMENT`), with `Component = as ??
VARIANT_ELEMENT[variant]` rendering the caller's element/component with the library's classes
spread onto it. This composes with a router's own `Link` (`as={RouterLink}` +
`ComponentPropsWithoutRef<C>` picking up its props, e.g. `to`), which is exactly the
router-agnostic requirement a new `Link` component has.

Separately, `.agents/rules/wrap-trigger-never-clone.md` documents that `Tooltip`/`Popover` reject
`cloneElement` for a *trigger* they wrap (ref/handlers go on a wrapping `<span>`) because an
arbitrary consumer node isn't guaranteed to forward a ref or spread props. That rule is about
wrapping a child, not about a component rendering *as* another element, but it reinforces the
same bias against relying on an unknown component's prop-forwarding — which the polymorphic
`as` + generic-props pattern sidesteps by making the caller supply the element/component type
itself rather than the library discovering it via `cloneElement`.
