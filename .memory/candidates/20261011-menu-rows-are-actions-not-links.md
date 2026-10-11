---
about: Menu rows are div role=menuitem with onSelect only; no href/as/link rendering, so nav links in an overflow Menu are unsupported today
saw:
  - source/react-ui/packages/ui/src/internal/menuPanel.tsx
  - source/react-ui/packages/ui/src/Menu/Menu.tsx
  - source/react-ui/packages/ui/src/SideNav/SideNav.tsx
  - source/react-ui/packages/ui/src/Breadcrumbs/Breadcrumbs.tsx
  - docs/adr/0026-menu-and-dropdown-are-separate-components.md
  - docs/adr/0030-menu-moves-real-focus-and-roving-tabindex.md
  - docs/adr/0045-sidenav-owns-its-responsive-switch.md
  - docs/adr/0021-link-external-affordance-is-an-explicit-prop.md
---
`menuPanel.tsx:229-310` MenuRow renders `<div role=menuitem tabIndex>`; MenuItemProps = content props + `onSelect` (:312-316);
no href, `as`, or aria-current. assertMenuRows (menu-children-validated-at-root-render note) rejects wrappers, so a
link-row cannot be composed from outside. Panel is `role="menu"` (Menu.tsx:85-90); ADR 0026 frames Menu as an action list.
Link convention elsewhere: `as` prop (SideNav.tsx:117,133, Link, ADR 0021) and Breadcrumbs `linkAs` + `linkProps`
(Breadcrumbs.tsx:28,152); aria-current="page" via `current` boolean (SideNav.tsx:104,159) and on the current crumb (:139).
Menu closes on activation and a row is not an anchor, so middle-click/open-in-new-tab is lost. TopNav overflow therefore
needs either a new Menu row type (needs ADR; ADR 0030 says rows are Item/Checkbox/Radio only) or onSelect + router navigate.
ADR 0045 rejected a separate MobileNav (#70 resolved as a SideNav mode); no ADR/issue text mentions TopNav, slots, or
ThemeToggle (#74) composing with it (gh api issues 70, 74: bodies are generic definition-of-done only).
