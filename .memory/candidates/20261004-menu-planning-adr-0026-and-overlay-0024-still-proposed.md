---
about: Menu owns its focus code instead of reusing Tree's hooks or useListboxKeyboard; src/internal holds only code shared by 2+ components and never imports from a component, so a Menu reusing Tree's hooks would have needed them promoted
saw:
  - docs/adr/0026-menu-and-dropdown-are-separate-components.md
  - docs/adr/0030-menu-moves-real-focus-and-roving-tabindex.md
  - docs/adr/0024-tree-is-data-driven-with-roving-tabindex-over-a-flattened-row-model.md
  - source/react-ui/packages/ui/src/Menu/Menu.tsx
  - source/react-ui/packages/ui/src/internal/useListboxKeyboard.ts
  - source/react-ui/packages/ui/src/Tree/useTypeAhead.ts
  - source/react-ui/packages/ui/src/Tree/useControllableState.ts
---

- ADR 0026 (`0026-menu-and-dropdown-are-separate-components.md`) fixes the boundary: does the trigger show the result -> Dropdown, else Menu. Menu's focus model, keyboard and hook sharing are decided in `0030-menu-moves-real-focus-and-roving-tabindex.md`.
- Repo has duplicate ADR numbers (two 0018, 0020, 0022, 0024, 0025 and now 0029 is taken on main by the segmented-control ADR) - cite by filename, not number alone.
- Tree's `useTypeAhead.ts` and `useControllableState.ts` live in `src/Tree/`, not `src/internal/`. `src/internal/` = code shared by 2+ components, never imports from a component (ui AGENTS.md), so a component reusing Tree's hooks would need them promoted to `internal/` or would import a sibling's internals (forbidden). `Menu.tsx` therefore carries its own small amount of focus code on floating-ui's hooks.
- Rules a Menu trips: `.agents/rules/wrap-trigger-never-clone.md` (span wrapper with ref; clone only aria-haspopup/expanded/controls onto a single-element child), `portal-floating-ui-into-tandiko-root.md` (portal only through `useOverlayRoot`), `update-bundle-check-with-every-component.md`, `pure-annotate-compound-component-exports.md`, plus a story in the same PR.
