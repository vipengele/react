---
name: dropdown-option-rows-are-a-flat-index-space
kind: gotcha
description: Dropdown's listRef, disabledIndices and highlight all index one flat list of the current matches (not every option); Dropdown.Group flattens in place and adds no index-bearing row.
anchors:
  - path: source/react-ui/packages/ui/src/Dropdown/Dropdown.tsx
    blob: d5a03f7bf488
  - path: source/react-ui/packages/ui/src/internal/useListboxKeyboard.ts
    blob: 917e1aea36fa
  - path: docs/adr/0005-dropdown-autocomplete-compound-option-children.md
    blob: 37a64271f419
  - path: docs/adr/0013-dropdown-is-the-one-searchable-combobox.md
    blob: 8456314e6c45
confidence: verified
---

All paths below are under `source/react-ui/packages/ui/src/`.

**Children.** `readOptions` (`Dropdown/Dropdown.tsx:317-336`) walks `children` with
`Children.forEach` (`:320`), skips falsy children (`:321-323`), flattens a `Dropdown.Group`
(`:324-328`) and throws on anything else (`:330`, "Dropdown only accepts Dropdown.Option and
Dropdown.Group as children."). The throw is **unconditional, not gated on `NODE_ENV`** — its
docstring (`:310-316`) says why: an unrecognised child is an option the keyboard, the type-ahead
and the selection never see. A Group inside a Group throws separately in `readGroupOptions`
(`:302`), so flattening is exactly one level deep. ADR 0005 states the policy
(`0005-*.md:12-16`) and is amended by ADR 0013 to admit `Dropdown.Group` (`0005-*.md:25-30`).

**One flat index space.** A group's options are spread in place (`Dropdown.tsx:326`), so an
option's index "is the index it would hold with no group around it" (`:311-313`). The group
heading is not a row with an index: groups are a render-time partition of the same array
(`groupsOf`, `:338-349`; `visibleGroups`, `:594`). Async results, which the API may return
interleaved, are reordered by `inGroupOrder` (`:351-360`, applied at `:552-560`) *before*
anything indexes them, so DOM order and index order stay the same order.

**The index space is the matches, not the options.** `matches` (`:588`, reasoning at
`:583-587`) is the search-filtered list (or async results, or every option when not searchable),
and every index derives from it: `optionIndices` (`:591`), `disabledIndices` (`:598`), the
`listRef` length trim `listRef.current.length = matches.length` (`:606`, why at `:601-605`), and
`registerOption(index, node)` writing `listRef.current[index]` (`:837-844`, index looked up at
`:129`). The one exception is `resolveSelection(selection, options)` (`:597`), resolved against
every option so a selection the query filters out still shows in the trigger and its chip
(`:595-596`).

`useListNavigation` takes `listRef`, `activeIndex` and `disabledIndices` as parallel arrays
(`internal/useListboxKeyboard.ts:226-233`), and the type-ahead's `labelsRef` maps `listRef` by the
same index, skipping disabled ones (`:193-202`). So anything new that renders inside the listbox
must either stay out of `listRef` entirely (as group headings do) or be a real entry in `matches`
— a row that is in the DOM *and* in `listRef` without being a match breaks arrow traversal,
`loop: true` wraparound and type-ahead alike.

`registerOption`'s null guard (`:841`) is load-bearing: a detaching ref from an option a shorter
render dropped would otherwise write past the trim (`:838-840`).
