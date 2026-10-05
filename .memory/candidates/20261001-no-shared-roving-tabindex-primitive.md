---
about: keyboard handling in packages/ui is four unrelated implementations (Tabs and Tree hand-roll roving tabindex, Dropdown uses useListboxKeyboard with virtual focus, Menu uses floating-ui useListNavigation with real focus); no shared roving or type-ahead primitive exists and none is part of any ADR's decision
saw:
  - source/react-ui/packages/ui/src/Tabs/Tabs.tsx
  - source/react-ui/packages/ui/src/Tree/Tree.tsx
  - source/react-ui/packages/ui/src/internal/useListboxKeyboard.ts
  - source/react-ui/packages/ui/src/Menu/Menu.tsx
  - docs/adr/0030-menu-moves-real-focus-and-roving-tabindex.md
  - source/react-ui/packages/ui/AGENTS.md
  - docs/adr/0004-aria-activedescendant-for-dropdown-and-autocomplete.md
  - docs/adr/0024-tree-is-data-driven-with-roving-tabindex-over-a-flattened-row-model.md
  - docs/adr/0025-tanstack-react-virtual-for-opt-in-tree-windowing.md
  - source/react-ui/packages/ui/vitest.config.ts
---

- Tabs hand-writes roving tabindex: `Tabs.tsx:67-92` (handleKeyDown queries enabled tabs from
  the DOM, modulo wraparound, focuses the target), `tabIndex` at `:132-135`. No type-ahead. A DOM
  query for "the next row" is wrong once rows can be unmounted.
- Tree hand-writes roving tabindex over the `flatten()` visible-row model, never over the DOM:
  focus moves by row index (`Tree.tsx` `focusOn` / `focusElement`), with its own type-ahead.
  ADR 0024 rejects both `aria-activedescendant` and a shared internal primitive for it.
- Dropdown uses `useListboxKeyboard.ts` (floating-ui `useListNavigation` + `useTypeahead`,
  labelsRef), virtual focus via aria-activedescendant. It is tied to floating-ui and never moves
  real focus. ADR 0004 rejected roving tabindex for Dropdown only to share one hook between
  Dropdown and Autocomplete.
- Menu (`Menu.tsx`) is a fourth: floating-ui `useListNavigation` (non-virtual, real DOM focus, roving tabIndex) and `useTypeahead`, rows registering through `FloatingList`/`useListItem`. It reuses neither `useListboxKeyboard` nor Tree's hooks; `0030-menu-moves-real-focus-and-roving-tabindex.md` leaves consolidation undecided.
- Runtime dependencies of `@vipengele/react-ui`: `@floating-ui/react`, `@vipengele/ts` and
  `@tanstack/react-virtual` (ADR 0025, used by `Tree` only when `virtualized`), beyond
  `@vipengele/react-icons`. `packages/ui/AGENTS.md` says to read ADR 0002, 0020 and 0025 before
  adding another. The workspace enforces minimumReleaseAge 10080 (1 week), trustPolicy
  no-downgrade and blockExoticSubdeps.
- Coverage: `vitest.config.ts` has 100% thresholds over both projects together; `*.browser.test.*`
  run in chromium only, so a branch only chromium reaches (the virtualized Tree) is still covered.
