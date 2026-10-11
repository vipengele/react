---
about: the rows a menu accepts depend on its owner (only Menu takes LinkItem), and a link row's Enter, Space, modifier-click and disabled behaviour each rely on native link behaviour that only a browser test can exercise
saw:
  - source/react-ui/packages/ui/src/internal/menuPanel.tsx
  - source/react-ui/packages/ui/src/ContextMenu/ContextMenu.tsx
  - source/react-ui/packages/ui/src/Menu/Menu.browser.test.tsx
  - source/react-ui/packages/ui/src/Menu/Menu.test.tsx
  - docs/adr/0046-menu-link-rows.md
---
`assertMenuRows` (`menuPanel.tsx:194`) takes the owner string (`"Menu"`, `"ContextMenu"`, `"Menu.Group"`...) and derives `root`
from the part before the first dot; `acceptsLinks` (`:200`) is `root === "Menu"`, so `LinkItem` is in the accepted types and in the
error text's names only under `Menu` and its groups. `ContextMenu` shares the row objects but its accepted-rows string is unchanged,
and Menu's error text now reads `Menu.Item, Menu.LinkItem, Menu.CheckboxItem, ...`, which the child-validation tests in
`Menu.test.tsx` assert exactly.

Link row activation (`MenuLinkItem`, `:381`): `Enter` is not handled by the menu, because the anchor's native activation dispatches
the click that closes it; `Space` calls `currentTarget.click()` (`:430`) unless a typeahead string is being typed;
`opensElsewhere` (`:368`) keeps the menu open for a non-primary button or ctrl/meta/shift/alt; a middle click arrives as `auxclick`,
which the menu never listens to. A disabled row cancels navigation only in its `onClick` (`preventDefault`), so Enter on a disabled
link depends on the browser turning Enter into that click. jsdom produces no such click, so Enter, middle-click and the disabled
Enter case are provable only in `Menu.browser.test.tsx` (the disabled case is its "does not navigate or close on Enter when
disabled" test).
