---
name: menu-link-item-exists-for-native-link-behaviour
kind: rationale
description: Menu has one link row, Menu.LinkItem, a real anchor; Menu.Item stays an action div and ContextMenu stays action-only, because middle-click, new-tab, router `as` and aria-current live in the row, not in onSelect.
anchors:
  - path: source/react-ui/packages/ui/src/internal/menuPanel.tsx
    blob: 02d787a37486
  - path: source/react-ui/packages/ui/src/Menu/Menu.tsx
    blob: d2a440c99893
  - path: docs/adr/0046-menu-link-rows.md
    blob: 7c67034773f2
confidence: verified
---

`Menu.LinkItem` (`menuPanel.tsx:392`, attached at `Menu.tsx:226`) renders `<a>`, or the `as`
component, with `role="menuitem"`, and takes `current` -> `aria-current="page"` like the link
convention elsewhere (ADR 0021). `Menu.Item` is still a `div role=menuitem` with only `onSelect`
(`menuPanel.tsx:336`). ADR 0046 records why a link row exists rather than an `onSelect` that
navigates: that row would lose middle-click, open-in-new-tab, router `as` and `aria-current`. It
amends ADR 0030 only on `Enter`, which a link row leaves to the link's native click. ADR 0026 (Menu as
an action list) is untouched. TopNav's overflow menu is the consumer the row exists for; ADR 0045
rejected a separate MobileNav. Which owners accept the row, and how it activates:
[[menu-link-rows-owner-dependent-and-browser-only]].
