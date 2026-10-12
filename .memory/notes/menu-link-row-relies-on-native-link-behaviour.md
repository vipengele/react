---
name: menu-link-row-relies-on-native-link-behaviour
kind: gotcha
description: Only Menu accepts LinkItem rows, and a link row's Enter, middle-click and disabled-Enter behaviour come from the browser's native link activation, so only a browser test can exercise them.
anchors:
  - path: source/react-ui/packages/ui/src/internal/menuPanel.tsx
    blob: 02d787a37486
  - path: source/react-ui/packages/ui/src/ContextMenu/ContextMenu.tsx
    blob: e43e8ca5f3db
  - path: source/react-ui/packages/ui/src/Menu/Menu.browser.test.tsx
    blob: d2f31ecb23e9
  - path: source/react-ui/packages/ui/src/Menu/Menu.test.tsx
    blob: b03dce40c66f
  - path: docs/adr/0046-menu-link-rows.md
    blob: 7c67034773f2
confidence: verified
---

- `assertMenuRows(children, owner, allowGroup)` (`menuPanel.tsx:194`) derives `root` from the part of `owner` before
  the first dot; `acceptsLinks` is `root === "Menu"` (`:200`), and only then is `MenuLinkItem` an accepted row type
  and named in the error text (`:202-214`). `ContextMenu.tsx` never references `LinkItem`, so it stays action-only.
  Menu's error text therefore reads `Menu.Item, Menu.LinkItem, ...`, which the child-validation tests in
  `Menu.test.tsx` assert.
- `MenuLinkItem` (`:392`) renders `role="menuitem"` on an `<a>` or the `as` component, with `current` setting
  `aria-current="page"` (`:418`). `Enter` is not handled by the menu: the anchor's native activation dispatches the
  click that closes it (`:440`). `Space` calls `currentTarget.click()` (`:445`) unless typeahead is active
  (`isTyping()`, `:442`). `opensElsewhere` (`:375`) keeps the menu open for modified clicks, and a middle click
  arrives as `auxclick`, which the menu never listens to.
- A disabled link row cancels navigation only in its `onClick`, so Enter on it depends on the browser turning Enter
  into that click. jsdom produces no such click, so Enter, middle-click and disabled-Enter are provable only in
  `Menu.browser.test.tsx` (the test "does not navigate or close on Enter when disabled", `:442`).

Why the row exists rather than an `onSelect` that navigates: see [[menu-rows-are-actions-link-row-is-the-exception]].
