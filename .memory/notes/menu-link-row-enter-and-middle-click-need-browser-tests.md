---
name: menu-link-row-enter-and-middle-click-need-browser-tests
kind: gotcha
description: Only Menu and its groups accept LinkItem rows, and a link row's Enter, middle-click and disabled-Enter behaviour rest on native link activation that jsdom cannot produce.
anchors:
  - path: source/react-ui/packages/ui/src/internal/menuPanel.tsx
    blob: 02d787a37486
  - path: source/react-ui/packages/ui/src/Menu/Menu.browser.test.tsx
    blob: d2f31ecb23e9
  - path: source/react-ui/packages/ui/src/Menu/Menu.test.tsx
    blob: b03dce40c66f
  - path: docs/adr/0046-menu-link-rows.md
    blob: 7c67034773f2
confidence: suspect
---

- `assertMenuRows` derives `root` from the owner string before its first dot and `acceptsLinks = root ===
  "Menu"` (`menuPanel.tsx:194-203`), so `ContextMenu` rejects `LinkItem` and the accepted-names text in the
  error differs per owner; `Menu.test.tsx` asserts that text exactly.
- `MenuLinkItem` leaves `Enter` to the anchor's native click, which closes the menu; `Space` clicks the
  anchor; a modifier or non-primary click keeps the menu open (`opensElsewhere`); a middle click arrives as
  `auxclick` (`menuPanel.tsx:372-380`). A disabled row cancels navigation only in `onClick`, so disabled
  Enter relies on the browser turning Enter into that click.
- jsdom produces no such click, so these are provable only in `Menu.browser.test.tsx`.

Suspect: the `Space` line (`:430`) and the browser test name were taken from the staging note, not re-opened.
