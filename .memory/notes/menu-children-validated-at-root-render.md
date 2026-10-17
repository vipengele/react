---
name: menu-children-validated-at-root-render
kind: gotcha
description: Menu validates its children by element-type identity on every render, open or shut, so a wrapper component around Menu.Item is rejected and error names depend on function names.
anchors:
  - path: source/react-ui/packages/ui/src/internal/menuPanel.tsx
    blob: 02d787a37486
  - path: source/react-ui/packages/ui/src/Menu/Menu.test.tsx
    blob: b03dce40c66f
confidence: verified
---

`assertMenuRows` (`menuPanel.tsx:194-230`, shared with ContextMenu; called at `Menu/Menu.tsx:70`) runs in `MenuRoot` before the panel renders, so a
wrong child throws at the call site, not on first open. It recurses into fragments and `Menu.Group` children (`:210`, `:220-221`),
disallows groups in groups, and checks accepted types by identity against the Menu item components; a wrapper that
renders a `Menu.Item` is rejected because its element type is the wrapper. `describeChild` (`:176`) names a
rejected child by tag, component `name` or text, and component names may be mangled by a production minifier.
`Menu.RadioItem` also needs an enclosing `Menu.Group` context.
