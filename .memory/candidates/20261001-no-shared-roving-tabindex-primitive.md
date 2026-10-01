---
about: keyboard handling in packages/ui is two unrelated implementations (Tabs hand-rolled roving tabindex, Dropdown via useListboxKeyboard/floating-ui); no shared roving or type-ahead primitive exists and none was ever decided on
saw:
  - source/react-ui/packages/ui/src/Tabs/Tabs.tsx
  - source/react-ui/packages/ui/src/internal/useListboxKeyboard.ts
  - source/react-ui/packages/ui/AGENTS.md
  - docs/adr/0004-aria-activedescendant-for-dropdown-and-autocomplete.md
  - docs/adr/0020-numberinput-owns-spinbutton-semantics-and-locale-parsing.md
  - source/react-ui/packages/ui/vitest.config.ts
---

Found while scoping a planned Tree (treeitem, roving tabindex, type-ahead, virtualization).

- Tabs hand-writes roving tabindex: `Tabs.tsx:67-92` (handleKeyDown queries enabled tabs from
  the DOM, modulo wraparound, focuses the target), `tabIndex` at `:132-135`. No type-ahead.
- Dropdown uses `useListboxKeyboard.ts` (floating-ui `useListNavigation` + `useTypeahead` at
  `:236`, labelsRef `:188-202`), virtual focus via aria-activedescendant. It is tied to
  floating-ui and never moves real focus.
- ADR 0004 considered "roving tabindex for Dropdown" and rejected it only to share one hook
  between Dropdown and Autocomplete; it never decided on a shared roving primitive. ADR 0020:27
  merely notes the two precedents. Grep of docs/adr and AGENTS.md for roving/virtual/tanstack:
  no decision on a shared primitive, virtualization, or a virtualization library.
- Runtime-dependency policy: `packages/ui/AGENTS.md` says `@floating-ui/react` and
  `@vipengele/ts` are the only real deps and to read ADR 0002 and ADR 0020 before adding another.
  Root `pnpm-workspace.yaml` has minimumReleaseAge 10080 (1 week), trustPolicy no-downgrade,
  blockExoticSubdeps. No virtualization lib is present.
- The only repo mentions of hatua are ADR 0001:5 (HatuaProvider pattern) and ADR 0015:12
  (release model). Nothing about ReferenceTree. No Wave 3 / issue 42 text exists in the repo
  (grep of md/yaml/yml); no Menu or Disclosure component exists in src/.
- Coverage: vitest.config.ts has 100% thresholds; `*.browser.test.*` run in chromium only.
