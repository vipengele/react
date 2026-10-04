---
about: before building Menu - ADR 0026 fixes the Menu/Dropdown boundary but leaves focus model and hook sharing open; the overlay foundation Menu builds on (useOverlayRoot, overlayTree, --vpg-layer-menu) exists
saw:
  - docs/adr/0026-menu-and-dropdown-are-separate-components.md
  - docs/adr/0024-overlay-layering-and-portal-ownership.md
  - docs/adr/0024-tree-is-data-driven-with-roving-tabindex-over-a-flattened-row-model.md
  - source/react-ui/packages/tokens/src/theme.ts
  - source/react-ui/packages/ui/src/internal/useOverlayRoot.ts
  - source/react-ui/packages/ui/src/internal/overlayTree.tsx
  - source/react-ui/packages/ui/src/internal/useListboxKeyboard.ts
  - source/react-ui/packages/ui/src/Tree/useTypeAhead.ts
  - source/react-ui/packages/ui/src/Tree/useControllableState.ts
---

Supersedes the candidate 20261001-no-menu-component-dropdown-boundary (ADR 0026 exists; no Menu component yet).

- ADR 0026 (`0026-menu-and-dropdown-are-separate-components.md`): test is "does the trigger show the result" -> Dropdown, else Menu. Explicitly "Left open": Menu's focus model, keyboard details, and whether it shares `useListboxKeyboard` or other Dropdown internals - to be decided by the ADR accompanying Menu. Rejects a Dropdown mode / role-by-prop.
- The overlay foundation is in place: a Menu portals through `useOverlayRoot(elements.domReference)`, wraps its shell in `OverlayTreeShell`, registers with `useOverlayTreeNode()` and stacks on `--vpg-layer-menu` (1200, shared with listbox). `theme.ts` already defines the token; nothing consumes it yet.
- Repo has duplicate ADR numbers (two 0018, 0020, 0022, 0024, 0025) - cite by filename, not number alone.
- Roving tabindex / type-ahead: no shared utility. Tabs and Tree hand-roll; Tree's `useTypeAhead.ts` and `useControllableState.ts` live in `src/Tree/`, not `src/internal/`. Tree ADR rejects reusing `useListboxKeyboard` (floating-ui + aria-activedescendant). `src/internal/` = code shared by 2+ components, never imports from a component (ui AGENTS.md); a Menu reusing Tree's hooks would need promoting them to internal/ or importing a sibling's internals (forbidden).
- Rules a Menu trips: `.agents/rules/wrap-trigger-never-clone.md` (span wrapper with ref; clone only aria-haspopup/expanded/controls onto a single-element child), `portal-floating-ui-into-tandiko-root.md` (now: portal only through `useOverlayRoot`), `update-bundle-check-with-every-component.md`, `pure-annotate-compound-component-exports.md`, plus a story in the same PR.
