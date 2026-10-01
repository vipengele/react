# Tree takes an `items` data prop and moves real focus by roving tabindex over a flattened row model

`Tree` renders hierarchical data of any shape: file systems, outline documents, nested
settings. Consumers already hold that data as a tree, and need to decide per row what it looks
like and how it behaves.

## API

`Tree` takes `items` and a `renderItem(node, state)` function, and reads the data's shape
through `getId`, `getLabel` and `getChildren`, so it is generic over the node type. `state`
carries what the row needs to draw itself: level, expanded, selected, focused, disabled.

This differs from `Dropdown` (ADR 0005), which reads compound `Option` children. That ADR
chose children because `Dropdown`/`Autocomplete` inspect a short, flat, hand-authored list.
A tree is the opposite: it is usually large, loaded or derived rather than typed out, and
arbitrarily deep. Mapping it to nested JSX would force every consumer to write a recursive
renderer just to hand the component data it already has, and `Tree` could not see rows that
are collapsed or windowed away without mounting them.

## Focus and keyboard

`Tree` uses a real roving tabindex: exactly one row has `tabIndex={0}`, every other row has
`-1`, and arrow keys move DOM focus between rows. Keyboard handling, including type-ahead,
is local to `Tree`.

Rows are flat siblings. Each carries `aria-level`, `aria-setsize` and `aria-posinset`, and
there is no `role="group"` wrapper. Nesting in the DOM is not needed to express the
hierarchy, and a flat list is what lets rows be windowed (ADR 0025).

Navigation works off a `flatten()` function that turns `items` plus the expanded set into the
ordered list of visible rows. It does not query the DOM. `Tabs` hand-rolls its roving
tabindex over DOM queries, which is correct only while every tab is mounted; under
virtualization the next row may not exist in the DOM, so the visible-row model, not the DOM,
is the source of truth for "next", "previous", "first", "last" and type-ahead.

The tabbable row (the one with `tabIndex={0}`, whether or not it currently has focus) is
always kept mounted, by including its index in the virtualizer's `rangeExtractor`. When the
selected row scrolls out of the window and is unmounted, no row would be tabbable and `Tab`
would skip the whole tree.

### Focus recovery

If the tabbable row leaves the model (its parent is collapsed, or `items` changes and the
node is gone), the tabbable target moves to the nearest surviving ancestor, or failing that
the nearest surviving row. DOM focus moves with it only if it was inside the tree at the
time, so a background data update never pulls focus from elsewhere on the page.

## Selection and expansion

- `onAction(id)` fires when a row is activated (click, `Enter`). `onFocusChange(id)` fires as
  the tabbable row changes.
- `selectionMode` is `"none"` (default) or `"single"`. With `"single"`, `selectedId` /
  `defaultSelectedId` control the selection. Multi-select is deferred to a follow-up issue.
- `expanded` / `defaultExpanded` / `onExpandedChange` control which nodes are open.

## Row props

`getItemProps(node)` returns the props to spread on each `treeitem` the consumer renders.
`Tree`'s `role`, `aria-*`, `tabIndex`, keyboard handlers and click handlers win over any the
consumer passes alongside, because overriding them breaks the focus model. Refs are merged
rather than replaced. `ref` is an ordinary prop, as React 19 permits (the package's React
floor).

## Drag and drop

`Tree` ships none. Reordering and reparenting carry rules (drop targets, allowed moves,
auto-expand on hover, indicators) that belong to the consumer's domain. Consumers build it on
`getItemProps` with native HTML5 drag and drop.

## Considered options

- **Compound children (`Tree.Item`, `Tree.Group`).** Rejected, for the reasons under API
  above. It is also incompatible with virtualization, which needs to know about rows it has
  not rendered.
- **`aria-activedescendant`** (ADR 0004). Rejected: that ADR chose it so `Autocomplete`'s
  input could keep DOM focus. A tree has no such input, and a windowed row may not be in the
  DOM for `aria-activedescendant` to point at, whereas a roving tabindex keeps the one
  focusable row mounted.
- **A shared internal primitive, reusing `internal/useListboxKeyboard`.** Rejected: that hook
  is built around floating-ui (ADR 0002) and `aria-activedescendant`, both of which a tree
  does not use. Bending it to roving tabindex over a visible-row model would cost more than
  the keyboard logic it saves, and would couple the two components' behaviour.
