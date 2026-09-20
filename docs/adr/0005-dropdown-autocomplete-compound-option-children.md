# Dropdown and Autocomplete take `Dropdown.Option`/`Autocomplete.Option` children, not a data-array prop

Both components need to inspect option data programmatically — Autocomplete to filter by label
as the user types, both to render checkboxes and chips when `multiple` is set. A data-array prop
(`options: {value, label, icon?, disabled?}[]`) would make that direct. We use compound JSX
children instead, matching `Card`/`Tabs`' established shape in this package: `Dropdown`/
`Autocomplete` read each `Option` child's props (`value`, `label`, `icon`, `disabled`) the same
way `Card` reads `Card.Header`'s. Filtering in Autocomplete means evaluating each `Option`
child's `label` prop against the query and omitting non-matching children from what's rendered,
not filtering a data array before mapping it to elements.

Unexpected children throw at render, the same as `Card` — `Dropdown`/`Autocomplete` accept only
their own `Option` subcomponent (plus falsy children from conditional rendering, `Card`'s own
carve-out) directly beneath them, with no `Dropdown.List` layer: the floating listbox's
positioning is internal, not something the consumer arranges in JSX the way `Tabs.Panel`'s
placement is.

## Considered options

- **Data-array `options` prop.** Filtering and multi-select state become plain array operations
  instead of child-element inspection. Rejected to keep one compound-component idiom across the
  package's list-like components (`Tabs`, `Card`) rather than introducing a second, data-driven
  idiom alongside it.

## Amended by ADR 0013

`Dropdown.Group` joins `Dropdown.Option` as a compound child, read the same way: a group's
`label` prop names its heading, and its own children are the `Option`s it contains. A `Group`
nested inside a `Group` throws, the same runtime validation this ADR already applies to any
child that isn't an `Option` (or a falsy one, from conditional rendering).
