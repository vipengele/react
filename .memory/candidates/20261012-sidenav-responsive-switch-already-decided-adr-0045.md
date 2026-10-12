---
about: ADR-0045 already decides MobileNav is a SideNav mode (not a component); the decision is unimplemented and parts of it contradict other repo language
saw:
  - docs/adr/0045-sidenav-owns-its-responsive-switch.md
  - source/react-ui/packages/ui/src/SideNav/SideNav.tsx
  - source/react-ui/packages/tokens/src/color-mode.ts
  - source/react-ui/packages/tokens/src/theme.ts
  - CONTEXT.md
  - docs/adr/0037-grid-columns-auto-fit-from-a-column-width-scale.md
---
Cost: ~10 reads to establish.

- ADR-0045 (status accepted) already answers "distinct component or mode": a mode. Below a breakpoint
  SideNav children render in a modal left Drawer; API is `mobileOpen` / `onMobileOpenChange` /
  `SideNav.MobileToggle`; rail ignored in the drawer; MobileNav rejected (authoring nav twice).
- Not implemented: `grep -rniE "mobileOpen|MobileToggle|breakpoint" source/react-ui/packages/*/src` -> only a Grid comment. SideNav.tsx has no Drawer import. AGENTS.md (ui) :347 says the ADR "commits to" it.
- ADR claims "SideNav takes the repo's first matchMedia-based hook": false. tokens `color-mode.ts:30` already uses matchMedia via a subscribe/getServerSnapshot pair, server value `undefined` (ADR-0034 :49-52) - the SSR-safe precedent to copy.
- ADR says "the breakpoint is a token" but no breakpoint token exists (`theme.ts:340-343` are `--vpg-width-*` content ceilings). CONTEXT.md :123,:130 list "breakpoint" under _Avoid_ for the column and width scales; ADR-0037 is "responsive with no breakpoints". A viewport breakpoint token needs a new glossary term that does not collide with those.
- Duplicate ADR numbers exist (two 0034, two 0046); next free is 0048.
- A CSS media query cannot be a token read (var() is not allowed in @media), so a token-driven breakpoint forces the JS matchMedia path.
