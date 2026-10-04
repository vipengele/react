---
about: for a Breadcrumbs collapse, the only measured-overflow precedent is Dropdown's chip row; no ADR decides measured vs fixed-count; Menu is specified (ADR-0026) but not built, and neither are Drawer/Dialog, so "Wave 3 depends on Menu or Drawer" has nothing to depend on in the tree yet
saw:
  - source/react-ui/packages/ui/src/Dropdown/Dropdown.tsx
  - source/react-ui/packages/ui/.agents/rules/measure-real-layout-in-a-flushed-layout-effect.md
  - source/react-ui/packages/ui/src/index.ts
  - source/react-ui/packages/ui/src/Tabs/Tabs.tsx
  - docs/adr/0026-menu-and-dropdown-are-separate-components.md
  - docs/adr/0024-overlay-layering-and-portal-ownership.md
---

Found planning a `Breadcrumbs` component (checked 2026-10-04).

- Only `ResizeObserver` user in src (non-test): `Dropdown.tsx` (`measureHiddenChips` :449, observer :606, `flushSync(measure)`). Observes the *field* (`row.parentElement`), never the row it resizes. Governed by `.agents/rules/measure-real-layout-in-a-flushed-layout-effect.md`; jsdom's RO never fires and boxes are 0 wide, so any such code is browser-test-only (`measureHiddenChips` returns 0 when `clientWidth===0`, :455-460, which is also how a jsdom render stays uncollapsed).
- Tabs (`Tabs.tsx`) has no overflow/scroll handling; `grep -in 'overflow|ellipsis|maxItems'` -> nothing. No Pagination, Breadcrumbs or Toolbar exists (`grep -rniE 'pagination|breadcrumb|toolbar' src` -> only Tree/ButtonGroup/FieldShell incidental hits).
- No ADR or candidate decides measured vs fixed-count (`maxItems`/`itemsBeforeCollapse`) collapse; none records it tried and abandoned. Open decision. A fixed count is jsdom-testable; a measured one forces browser tests and the flushSync rule.
- Menu: ADR-0026 (read in full) decides only the Menu-vs-Dropdown boundary (trigger unchanged + rows fire handlers => Menu; roles menu/menuitem). Keyboard/focus model and whether it shares `useListboxKeyboard` are explicitly "left open" for the Menu component's own ADR. ADR-0024 is `status: proposed` and also covers Dialog/Drawer/Toast. `ls src` has no Menu, Dialog or Drawer; `index.ts` exports none; tokens source has no `--vpg-layer-menu`. So a Breadcrumbs that reveals collapsed items in a Menu cannot be built yet; only the inline-expand design (or `Popover`, which exists, `src/Popover/Popover.tsx`) can.
- Menu rows are action rows ("activating a row fires a handler", ADR-0026 intro); whether a menu item can render as a link/navigate is not decided anywhere.
