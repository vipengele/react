---
about: getFloatingProps() must be spread on the role=listbox element itself, not a wrapping panel, because it is what carries the id every aria-controls points at
saw:
  - packages/ui/src/Dropdown/Dropdown.tsx
---

`Dropdown.tsx`'s own comment states the rule at the point it matters
(`Dropdown.tsx:929-932`, on `renderSearchPanel`): "`getFloatingProps()` goes on the listbox rather
than on the panel around it — it carries the id every `aria-controls` points at, and on the panel
that id would name a box holding the search input too." Both render paths follow it:
`{...getFloatingProps()}` is spread on the `role="listbox"` element at `Dropdown.tsx:972` (search
mode, inside `renderSearchPanel`'s `<div ref={refs.setFloating}>` wrapper) and again at `:997`
(non-search mode), never on the outer panel div. `useRole`'s distributed source assigns
`floatingId` from `useId()` at the `useFloating` context (`floating-ui.react.mjs:2865`,
`:2900`), and it is `getFloatingProps()`'s own `id` attribute that puts that value on a live DOM
node — so whichever element receives the spread is the element every `aria-controls` on the
reference/search-input prop getters resolves to.
