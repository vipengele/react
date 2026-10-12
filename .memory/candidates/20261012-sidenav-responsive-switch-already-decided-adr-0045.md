---
about: ADR-0045 decides that mobile navigation is a SideNav mode (not a MobileNav component); SideNav implements it with a `mobileBelow` prop, not a token
saw:
  - docs/adr/0045-sidenav-owns-its-responsive-switch.md
  - source/react-ui/packages/ui/src/SideNav/SideNav.tsx
  - source/react-ui/packages/ui/src/internal/useMediaQuery.ts
  - source/react-ui/packages/tokens/src/color-mode.ts
  - CONTEXT.md
---
Cost: ~10 reads to establish.

- ADR-0045 (accepted) answers "distinct component or mode": a mode. Below `mobileBelow` the SideNav children
  render in a modal left `Drawer`; there is no `MobileNav` export (authoring the nav twice was the rejected option).
  `SideNav.Provider` owns the mobile state, `SideNav.MobileToggle` is the header-side trigger.
- The threshold is a `mobileBelow` prop (CSS length, default `"48rem"`) evaluated as `matchMedia("(width < X)")`
  through `useMediaQuery`, not a token. A media query cannot read a custom property (`var()` is not allowed in
  `@media`), so a token-driven breakpoint would have to be mirrored into JS; ADR-0045 records that as a rejected
  option. CONTEXT.md lists "breakpoint" under _Avoid_ for the Grid/Center width scales only; that is not why the
  prop is named `mobileBelow`.
- `useMediaQuery` is the first `matchMedia` hook in `packages/ui`; `packages/tokens/src/color-mode.ts` was the
  repo's first and is the SSR-safe precedent: a subscribe / getServerSnapshot pair whose server value is `undefined`.
