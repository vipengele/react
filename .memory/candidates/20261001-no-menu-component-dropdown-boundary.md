---
about: no Menu component exists or was tried; Dropdown is hard-wired to listbox/combobox/option semantics, so a menu cannot be a Dropdown mode
saw:
  - source/react-ui/packages/ui/src/Dropdown/Dropdown.tsx
  - source/react-ui/packages/ui/src/internal/useListboxKeyboard.ts
  - source/react-ui/packages/ui/src/index.ts
  - docs/adr/0013-dropdown-is-the-one-searchable-combobox.md
  - docs/adr/0024-overlay-layering-and-portal-ownership.md
---

Found while answering issue #37 (ADR for Menu vs Dropdown).

- No Menu: `ls source/react-ui/packages/ui/src` has no Menu dir; `grep -rniE '\bmenu' ` over ts/tsx/md (excl node_modules) hits only ADR-0024 (proposed; lists `Menu` among future overlays and gives it a `menu` layer step equal to `listbox`, lines 7,17,30,91), a FieldShell comment (FieldShell.stylesheet.ts:29) and skill docs. ADR-0013 never mentions Menu; no ADR records the boundary.
- Dropdown's semantics are fixed in useListboxKeyboard: `role: "select" | "combobox"` (useListboxKeyboard.ts:53) feeds floating-ui `useRole` (`:225`), which yields combobox + aria-haspopup=listbox on the trigger; panel is `role="listbox"` with aria-multiselectable (Dropdown.tsx:928-931, 974-976); groups are role="group" (:193). Navigation is `useListNavigation` virtual (aria-activedescendant, DOM focus never enters list), plus `useTypeahead`; `useClick` has keyboardHandlers:false (:204). A menu needs role="menu"/menuitem and (normally) real focus in the items: different useRole value and non-virtual navigation.
- Trigger is a `<div role="combobox">` inside FieldShell (Dropdown.tsx:1250-1257), with options coupled to selection value (getItemProps selected/active, :108,141). A menu fires actions, has no value/chips/clearable/search.
- Line drift in existing notes: Dropdown.tsx pointers in dropdown-option-rows-are-a-flat-index-space (readOptions 317 -> 319, Children.forEach 320 -> 322, listRef trim 606 -> 1053) and listbox-reference-is-the-control (trigger 1096-1119 -> ~1250, FloatingFocusManager :966 -> :944, search combobox ~:960 still) have moved; claims themselves still hold.
