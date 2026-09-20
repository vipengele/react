---
about: group flattening keeps DOM order and index order aligned in practice, and the flat index space is now the filtered matches, not every option
saw:
  - packages/ui/src/Dropdown/Dropdown.tsx
targets: dropdown-option-rows-are-a-flat-index-space
verdict: still-true
---

The core claim — one flat index space, indices assumed aligned across `listRef`,
`disabledIndices`, `values` and `useListNavigation`/`useTypeahead` — still holds, and the
`readOptions`/`registerOption` machinery it describes is unchanged in shape.

The note's framing of the "excluded from the index space" branch is no longer accurate, and it is
no longer hypothetical: `Dropdown.Group` shipped. `readGroupOptions` (`Dropdown.tsx:289-303`) and
`readOptions` (`Dropdown.tsx:312-331`) flatten a group's options **in place, depth-first**, into
the same `OptionDescriptor[]` — its own docstring (`Dropdown.tsx:305-310`) states this: "an
option's index here is the index it would hold with no group around it." DOM order and index
order do not diverge: `groupsOf`/`inGroupOrder` (`Dropdown.tsx:336-355`) reorder the flat array
itself before anything reads indices from it, so the array the listbox renders and the array
`listRef`/`disabledIndices` index into are the same array in the same order.
`registerOption`'s `listRef.current[values.indexOf(value)] = node` (`Dropdown.tsx:817`) still maps
each rendered row to its own slot with no separate group-aware branch.

A second change the note doesn't mention at all: every index is now an index into `matches`
(`Dropdown.tsx:565`, options filtered by the search query when `searchable`), not into the full
`options` list. `disabledIndices` (`:573`), `values` (`:566`) and `visibleGroups` (`:569`) are all
derived from `matches`. `resolveSelection` is the one exception, resolved "against every option,
not the matches" (`:570-572`) so a selection the query has filtered out of view stays selected.

The group-label cost the note describes (`listRef`/`disabledIndices` excluding label rows would
make DOM order diverge from index order) does not arise here because `Dropdown.Group` is a
render-time grouping over the flat array, not a separate row type with its own index — there is
no label row in `listRef` to exclude or include in the first place.
