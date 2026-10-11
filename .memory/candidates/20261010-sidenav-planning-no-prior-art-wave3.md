---
about: nav-item rendering has no shared primitive; aria-current is set per component (Breadcrumbs, Pagination, SideNav.Item); Wave 3 (TopNav 68 / MobileNav 70) and issues 68/70 are named nowhere in the repo's docs, and ADR 0033 is the only record of the MobileNav-vs-SideNav-mode decision
saw:
  - docs/adr/
  - source/react-ui/packages/ui/AGENTS.md
  - source/react-ui/packages/ui/src/Breadcrumbs/Breadcrumbs.tsx
  - source/react-ui/packages/ui/src/Pagination/Pagination.tsx
  - source/react-ui/packages/ui/src/Tree/rowState.ts
  - source/react-ui/apps/storybook/src/Drawer.stories.tsx
  - source/react-ui/apps/storybook/src/Tree.stories.tsx
---

Checked 2026-10-10.

- `grep -rniE "TopNav|MobileNav|Wave 3|TopBar"` over the repo (excluding node_modules/dist) -> only
  `docs/adr/0033-sidenav-owns-its-responsive-switch.md`, which rejects a separate MobileNav component. Wave 1 appears
  only in candidate 20261001-layout-primitive-adr-0019-and-fieldset-stacking. No ADR defines a nav-item primitive;
  `SideNav.Item` (`SideNav/SideNav.tsx`) implements its own polymorphic `as` typing rather than composing `Link`.
- `aria-current`: used by `SideNav/SideNav.tsx` (`current` prop), `Breadcrumbs.tsx:139` (`aria-current="page"` on the current crumb) and
  `Pagination.tsx:290` (current page button); no ADR or rule records it as a convention.
- Link rendering: ADR-0021 + `Link` `as` prop is the only router seam; no `asChild` anywhere; `wrap-trigger-never-clone.md`
  forbids cloning refs/handlers onto a consumer element.
- hatua: ADR-0001:5, ADR-0015:12, `Tree.stories.tsx:9,11` only; `hatua/` is not in this repo; no TopBar anywhere.
- Collapse/expand precedent: Disclosure (`aria-expanded` button, `hidden="until-found"` panel, height transition via
  `--vpg-duration-normal`, reduced motion collapses the duration tokens in the base stylesheet - no component media query)
  and Tree (flat `role=tree` rows, roving tabindex, `aria-expanded` from `rowState.ts:57`). Tree and Pagination use
  `internal/useControllableState`; Disclosure keeps its own `useState(defaultOpen)` (`Disclosure.tsx:48`).
