---
about: Menu has one link row, Menu.LinkItem, a real anchor; Menu.Item stays an action div and ContextMenu stays action-only, because the link convention (as, current) and the overflow-menu need for native link behaviour live in the row, not in onSelect
saw:
  - source/react-ui/packages/ui/src/internal/menuPanel.tsx
  - source/react-ui/packages/ui/src/Menu/Menu.tsx
  - source/react-ui/packages/ui/src/SideNav/SideNav.tsx
  - source/react-ui/packages/ui/src/Breadcrumbs/Breadcrumbs.tsx
  - docs/adr/0026-menu-and-dropdown-are-separate-components.md
  - docs/adr/0030-menu-moves-real-focus-and-roving-tabindex.md
  - docs/adr/0046-menu-link-rows.md
  - docs/adr/0045-sidenav-owns-its-responsive-switch.md
  - docs/adr/0021-link-external-affordance-is-an-explicit-prop.md
---
`Menu.LinkItem` (`menuPanel.tsx:381`, attached at `Menu.tsx:226`) renders `<a>`, or the `as` component, with `role="menuitem"`; it
takes `current` -> `aria-current="page"`, matching the link convention elsewhere (`as` and `current` on `SideNav.tsx:104,117,133,159`,
Breadcrumbs `linkAs` + `linkProps` at `Breadcrumbs.tsx:28,152`, ADR 0021). `Menu.Item` is still a `div role=menuitem` with only `onSelect`
(`menuPanel.tsx:336`). ADR 0046 records why a link row exists rather than an `onSelect` that navigates: that row would lose
middle-click, open-in-new-tab, router `as` and `aria-current`. It amends ADR 0030 only on `Enter`, which a link row leaves to the
link's native click. ADR 0026 (Menu as an action list) is untouched, and `ContextMenu` rejects the row (see the owner-dependent
accepted-rows candidate). TopNav's overflow menu is the consumer the row exists for. ADR 0045 rejected a separate MobileNav (#70
resolved as a SideNav mode).
