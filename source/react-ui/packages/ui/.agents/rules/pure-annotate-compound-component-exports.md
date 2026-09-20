# Annotate a compound component's `Object.assign` export with `/* @__PURE__ */`

`Object.assign(Impl, { ... })` is a call expression, and a bundler can't prove on its own that
calling it has no side effect. Without the annotation, importing anything else from this package
keeps the whole compound component's module reachable "just in case," defeating per-component
tree-shaking. With it, Rollup/esbuild trust that the call is side-effect-free and drop an unused
compound export entirely.

## Applies to

- Any component under `packages/ui/src/*/*.tsx` that ships a compound API (`Card.Header`,
  `Tabs.Tab`, and similarly shaped future components) via `Object.assign(Impl, { ... })`.

## Example

```tsx
// Correct
export const Tabs = /* @__PURE__ */ Object.assign(TabsImpl, {
  List: TabsList,
  Tab: TabsTab,
  Panel: TabsPanel,
}) as TabsComponent;

// Wrong — an unused `Tabs` import keeps the whole module reachable
export const Tabs = Object.assign(TabsImpl, {
  List: TabsList,
  Tab: TabsTab,
  Panel: TabsPanel,
}) as TabsComponent;
```

`bundle-check/` is what would actually catch a missing annotation — verify a new compound
component there per `update-bundle-check-with-every-component.md`, don't rely on remembering
this rule alone.
