---
name: menu-rows-are-actions-link-row-is-the-exception
kind: rationale
description: Menu.Item stays an action div with only onSelect and Menu.LinkItem is a real anchor, because an onSelect that navigates would lose middle-click, open-in-new-tab, router as and aria-current.
anchors:
  - path: source/react-ui/packages/ui/src/internal/menuPanel.tsx
    blob: 02d787a37486
  - path: source/react-ui/packages/ui/src/Menu/Menu.tsx
    blob: d2a440c99893
  - path: docs/adr/0046-menu-link-rows.md
    blob: 7c67034773f2
  - path: docs/adr/0026-menu-and-dropdown-are-separate-components.md
    blob: 13f00d1fa4b8
confidence: suspect
---

`Menu.Item` is a `role="menuitem"` row with only `onSelect` (`menuPanel.tsx:335-338`); `Menu.LinkItem` is attached at
`Menu.tsx:226` and follows the link convention used elsewhere (`as` plus `current`, as in SideNav and Breadcrumbs'
`linkAs`). ADR 0046 (`docs/adr/0046-menu-link-rows.md`) is where the reason lives; the explorer's reading is that
it amends ADR 0030 only on `Enter`, leaves ADR 0026's action-list stance untouched, and that TopNav's overflow
menu is the consumer the row exists for. Behaviour of the row is in [[menu-link-row-relies-on-native-link-behaviour]].

Suspect: the ADR contents and the SideNav/Breadcrumbs line references were not re-read here; only the `menuPanel.tsx`
and `Menu.tsx` pointers were.
