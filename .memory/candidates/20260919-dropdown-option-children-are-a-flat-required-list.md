---
about: readOptions throws on any non-Option child unconditionally, and every index downstream (listRef, disabledIndices, values) assumes options are the only rendered rows
saw:
  - packages/ui/src/Dropdown/Dropdown.tsx
  - docs/adr/0005-dropdown-autocomplete-compound-option-children.md
---

`Dropdown.tsx:134-149` (`readOptions`) walks `children` with `Children.forEach` and throws
unconditionally — not gated on `NODE_ENV` — the moment a child is neither falsy nor
`child.type === DropdownOption`. ADR 0005 (`:12-16`) states this in prose ("accept only their own
`Option` subcomponent... directly beneath them, with no `Dropdown.List` layer") but the
enforcement is a hard runtime throw, not a lint or type constraint, so any new compound child
type — a `Dropdown.Group` label row, a separator — placed directly under `Dropdown` throws at
render today.

Everything downstream is a flat array keyed by an option's position in that same list:
`options.flatMap(...)` builds `disabledIndices` by position (`:189`), `listRef.current.length` is
set to `values.length` (`:196`), and `useListboxKeyboard`'s `useListNavigation` call
(`useListboxKeyboard.ts:190-197`) uses `listRef`/`disabledIndices` as parallel arrays indexed by
that same position — arrow-key traversal, `loop: true` wraparound, and type-ahead all assume index
`i` in `listRef` is option `i` in `options`.

A group label or separator row has two ways to fit this shape, neither free: rendered but
excluded from `listRef`/`disabledIndices` entirely (so indices stay option-only, but then the
list's *visual* DOM order and the *keyboard* index order diverge, which is what `useListNavigation`
docs warn can break `Home`/`End`/loop assumptions if the row is interactive at all), or rendered
and added to `listRef` as an always-disabled index (keeps DOM/index order aligned, but then
`disabledIndices` and `values`/`selectedOptions` — which currently assume every index is a real,
selectable option — must both learn to skip group rows). ADR 0005 doesn't anticipate either path;
it only rules out a data-array prop and a `Dropdown.List` layer.
