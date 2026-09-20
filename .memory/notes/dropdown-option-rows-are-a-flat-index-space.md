---
name: dropdown-option-rows-are-a-flat-index-space
kind: gotcha
description: Dropdown's options, listRef, disabledIndices and values are one flat index space keyed by option position, so a group label or separator row cannot simply be added as a Dropdown child.
anchors:
  - path: packages/ui/src/Dropdown/Dropdown.tsx
    blob: 3ece2c53e83e
  - path: packages/ui/src/internal/useListboxKeyboard.ts
    blob: f241e7c60a6d
  - path: docs/adr/0005-dropdown-autocomplete-compound-option-children.md
    blob: 97d03b89cfaa
confidence: verified
---

`readOptions` (`Dropdown.tsx:134-149`) walks `children` with `Children.forEach` and throws the
moment a child is neither falsy nor `child.type === DropdownOption` (`:141-143`). The throw is
**unconditional, not gated on `NODE_ENV`** — its own docstring (`:127-133`) says why: an
unrecognised child is an option the keyboard, the type-ahead and the selection never see.

ADR 0005 states the policy in prose — accept only the component's own `Option` subcomponent
directly beneath it, with no `Dropdown.List` layer (`0005-dropdown-autocomplete-compound-option-children.md:12-16`)
— but enforcement is a runtime throw, not a lint or a type constraint. Any new compound child
type placed directly under `Dropdown` throws at render today.

The harder constraint is downstream: everything is a flat array keyed by an option's position in
that one list.

- `options` is built in render order (`Dropdown.tsx:186`).
- `disabledIndices` is `options.flatMap((option, index) => ...)`, positions into `options` (`:189`).
- `listRef.current.length` is forced to `values.length` (`:196`).
- `useListNavigation` takes `listRef`, `activeIndex` and `disabledIndices` as parallel arrays
  (`useListboxKeyboard.ts:190-197`), so arrow traversal, `loop: true` wraparound and type-ahead
  all assume index `i` in `listRef` is option `i` in `options`. `useTypeahead`'s label getter
  indexes the same way (`useListboxKeyboard.ts:165-174`).

So a group label or separator row has two possible shapes, neither free. Excluded from
`listRef`/`disabledIndices` entirely, indices stay option-only but the listbox's DOM order and
its keyboard index order diverge. Included as an always-disabled index, DOM and index order stay
aligned but `values` and `selectedOptions` (`:187-188`) — which today assume every index is a
real, selectable option — must both learn to skip non-option rows. ADR 0005 anticipates neither;
it only rules out a data-array prop and a `Dropdown.List` layer.
