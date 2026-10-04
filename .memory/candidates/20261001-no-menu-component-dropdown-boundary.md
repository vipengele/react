---
about: Dropdown is hard-wired to listbox/combobox/option semantics with virtual focus, which is why Menu is a separate component rather than a Dropdown mode
saw:
  - source/react-ui/packages/ui/src/Dropdown/Dropdown.tsx
  - source/react-ui/packages/ui/src/internal/useListboxKeyboard.ts
  - source/react-ui/packages/ui/src/Menu/Menu.tsx
  - docs/adr/0026-menu-and-dropdown-are-separate-components.md
  - docs/adr/0013-dropdown-is-the-one-searchable-combobox.md
  - docs/adr/0024-overlay-layering-and-portal-ownership.md
---

- Dropdown's semantics are fixed in useListboxKeyboard: `role: "select" | "combobox"` (useListboxKeyboard.ts:53) feeds floating-ui `useRole` (`:225`), which yields combobox + aria-haspopup=listbox on the trigger; panel is `role="listbox"` with aria-multiselectable (Dropdown.tsx:928-931, 974-976); groups are role="group" (:193). Navigation is `useListNavigation` virtual (aria-activedescendant, DOM focus never enters list), plus `useTypeahead`; `useClick` has keyboardHandlers:false (:204). A menu needs role="menu"/menuitem and (normally) real focus in the items: different useRole value and non-virtual navigation.
- Trigger is a `<div role="combobox">` inside FieldShell (Dropdown.tsx:1250-1257), with options coupled to selection value (getItemProps selected/active, :108,141). A menu fires actions, has no value/chips/clearable/search.
- Line pointers in the existing Dropdown notes drift with every edit to Dropdown.tsx; the claims themselves still hold. Re-find a symbol by name, not by a cited line number.
