---
about: a portaled element must mount inside the nearest .tandiko-root, not document.body, or it loses every --tandiko-* value
saw: packages/ui/src/Tooltip/Tooltip.tsx, packages/ui/src/Popover/Popover.tsx, packages/tokens/src/ThemeProvider.tsx
---

`ThemeProvider` assigns every `--tandiko-*` custom property as inline styles on `.tandiko-root`,
not `:root` (see `docs/adr/0001-theming-via-css-custom-properties-no-context-hook.md`). Floating
UI's own default (`@floating-ui/react`'s typical usage) portals to `document.body`, which sits
outside `.tandiko-root`'s subtree — every `var(--tandiko-*)` the portaled element reads then
resolves to nothing, silently breaking dark mode and every other themed value for exactly that
element.

`Tooltip` and `Popover` both instead portal into `elements.domReference?.closest(".tandiko-root")`,
falling back to rendering inline (as the trigger's sibling, no portal) when no `.tandiko-root`
ancestor exists — an unthemed host page, or a test rendering the component alone. See
`docs/adr/0002-floating-ui-for-tooltip-and-popover-positioning.md` and
`packages/ui/.agents/rules/portal-floating-ui-into-tandiko-root.md`. Any future component that
portals content (Dialog, Drawer, Toast — slice 5 per the design-system plan) needs the same
lookup, not `document.body`.
