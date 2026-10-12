---
about: SideNav drawer mode behaviours that look like bugs or are invisible to a jsdom render: row remount on crossing, unresolved-only SSR marker, stable useMediaQuery subscription
saw:
  - source/react-ui/packages/ui/src/SideNav/SideNav.tsx
  - source/react-ui/packages/ui/src/SideNav/SideNav.stylesheet.ts
  - source/react-ui/packages/ui/src/internal/useMediaQuery.ts
  - source/react-ui/packages/ui/src/internal/useMediaQuery.test.tsx
  - source/react-ui/packages/ui/src/SideNav/SideNav.browser.test.tsx
  - source/react-ui/packages/ui/vitest.config.ts
---
Cost: several passes of review and a browser run to establish.

- Crossing `mobileBelow` remounts the nav's rows: `SideNavBody` renders the `<nav>` inside a `Drawer` in one branch and
  bare in the other, so they are different subtrees. An uncontrolled section restarts from its `defaultOpen` (a current
  item still reopens its sections). Keeping state across the switch would need a different tree shape.
- The SSR guard marker `data-vpg-side-nav-unresolved` is carried by the nav and `MobileToggle` only while the viewport is
  unresolved AND `mobileBelow` is the default (`isUnresolvedDefault` in `SideNav.tsx`); the `@media (width < 48rem)` /
  `(width >= 48rem)` rules in `SideNav.stylesheet.ts` are correct for that length only, and `DEFAULT_MOBILE_BELOW` is
  exported from the stylesheet so the rules and the default share one source. With a custom `mobileBelow`, server HTML
  is the docked nav and no toggle. A client-only jsdom `render()` resolves immediately, so only `renderToString` can
  observe the marker; the computed `display` of the two forms needs the browser project.
- `useMediaQuery` wraps `subscribe` and `getSnapshot` in `useCallback` keyed on `query`. `useSyncExternalStore`
  resubscribes whenever `subscribe` changes identity, and the provider re-renders on every drawer open/close, so inline
  closures re-add the `change` listener each time. `useMediaQuery.test.tsx` pins one add and zero removes across re-renders.
- In a closed `<dialog>` the nav's own computed `display` stays `flex` (the dialog is the `display: none` element), and
  jsdom computes an empty accessible name for elements inside a closed dialog; tests assert the dialog's display and the
  `aria-label` attribute instead.
- `SideNav.browser.test.tsx` is the only browser test importing `react-dom/server`. The chromium project pre-bundles it
  through `optimizeDeps.include` in `vitest.config.ts`, which keeps a warm dep cache that never saw the import from
  re-optimising mid-run and loading a duplicate React ("Invalid hook call").
