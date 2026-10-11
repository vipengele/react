---
name: menu-link-rows-owner-dependent-and-browser-only
kind: gotcha
description: Only Menu and its groups accept LinkItem rows (ContextMenu rejects them), and a link row's Enter and middle-click rely on native link behaviour that only a browser test can exercise.
anchors:
  - path: source/react-ui/packages/ui/src/internal/menuPanel.tsx
    blob: 02d787a37486
  - path: source/react-ui/packages/ui/src/ContextMenu/ContextMenu.tsx
    blob: e43e8ca5f3db
  - path: source/react-ui/packages/ui/src/Menu/Menu.browser.test.tsx
    blob: d2f31ecb23e9
  - path: source/react-ui/packages/ui/src/Menu/Menu.test.tsx
    blob: b03dce40c66f
confidence: suspect
---

`assertMenuRows` (`menuPanel.tsx:194`) takes the owner string (`"Menu"`, `"ContextMenu"`,
`"Menu.Group"`...) and derives `root` from the part before the first dot (`:197`); `acceptsLinks` is
`root === "Menu"` (`:200`), so `LinkItem` is accepted, and named in the error text (`:214`), only under
`Menu` and its groups. `ContextMenu` calls the same check with owner `"ContextMenu"`
(`ContextMenu.tsx:71`). Menu's error text therefore reads `Menu.Item, Menu.LinkItem, ...`, which the
child-validation tests in `Menu.test.tsx` assert exactly.

Link row activation (`MenuLinkItem`, `:392`): `Enter` is not handled by the menu, since the anchor's
native activation dispatches the click that closes it (comment `:440`); `Space` calls
`currentTarget.click()` (`:445`) unless a typeahead string is being typed; `opensElsewhere` (`:375`)
keeps the menu open for a non-primary button or a modifier; a middle click arrives as `auxclick`
(`:431`), which the menu never listens to. The explorer's claim that jsdom produces no native
Enter-to-click, so Enter and middle-click are provable only in `Menu.browser.test.tsx`, was not
re-verified (suspect). A disabled row drops its `href` and cancels `click`/`auxclick` (`:410-437`).
