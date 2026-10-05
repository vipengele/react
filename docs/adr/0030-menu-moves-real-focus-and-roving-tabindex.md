# `Menu` moves real focus onto its rows, with a roving tabindex

`0026-menu-and-dropdown-are-separate-components.md` fixes where a `Menu` ends and a `Dropdown`
begins, and leaves open how `Menu` moves focus, what its keyboard model is, how its trigger is
attached and how it dismisses. This ADR settles those.

## Decisions

- **Real focus, roving tabindex.** `Menu` moves DOM focus onto each row. The row holding focus has
  `tabIndex={0}` and every other row `-1`, so exactly one row is a tab stop. Navigation is
  floating-ui's `useListNavigation` (not `virtual`, `loop`, `focusItemOnOpen`) with `useTypeahead`
  beside it, and rows register through `FloatingList` and `useListItem`.
- **Where it opens.** Enter, Space, `ArrowDown` or a click opens on the first row; `ArrowUp` opens
  on the last. `ArrowUp`/`ArrowDown` wrap at either end, and `Home`/`End` jump to the ends.
- **Focus path.** The panel is the non-modal `FloatingFocusManager`'s initial focus, and list
  navigation moves focus on to the opening row once the rows have registered. A menu with no row
  keeps focus on the panel. Focus returns to the trigger on close, and focus leaving the panel
  closes the menu.
- **Disabled rows stay stops.** `disabledIndices` is empty, so arrow keys and typeahead still land
  on a disabled row. It carries `aria-disabled` and is inert: activating it fires no handler and
  does not close the menu. Without the empty list, floating-ui skips every `aria-disabled` row.
- **Typeahead and Space.** While a typeahead string is being typed, Space extends the string
  instead of activating the row, so a label containing a space can be typed in full. Enter always
  activates.
- **Index membership.** Only `Menu.Item`, `Menu.CheckboxItem` and `Menu.RadioItem` register.
  Separators and group labels are not in the focus index, so neither arrow keys nor typeahead stop
  on them.
- **`trigger` is a prop.** `Popover` and `Tooltip` take their trigger as `children`; a `Menu`'s
  `children` are its rows. The trigger is wrapped in a `<span>` that carries the reference ref
  and the click handler, and `aria-haspopup`, `aria-expanded` and `aria-controls` are cloned onto
  a single-element trigger so a screen reader sees them on the operable control. This is the
  carve-out in `wrap-trigger-never-clone.md`: the ref and handlers stay on the wrapper, and only
  plain ARIA props are cloned.
- **Dismissal follows floating-ui's defaults.** The menu is a `FloatingTree` node (see
  `0024-overlay-layering-and-portal-ownership.md`, which also owns the portal target and the
  `--vpg-layer-menu` step). Escape closes only the innermost open overlay, and an outside press
  closes the whole chain. `bubbles.outsidePress` is not overridden.
- **What closes the menu.** Activating a `Menu.Item` or `Menu.RadioItem` closes it; a
  `Menu.CheckboxItem` keeps it open so several toggles can be flipped in one visit. A radio row
  requires a `Menu.Group` and throws outside one, because the group is its set and holds the
  checked value. Checked state belongs to the caller: rows report a toggle and show what they are
  given.
- **Submenus are not supported.** Nothing here decides a submenu's focus, opening or dismissal
  model.

## Considered options

- **Virtual focus** (`aria-activedescendant` on a persistent control, as the `Dropdown` listbox
  does under `0004-aria-activedescendant-for-dropdown-and-autocomplete.md`) — rejected. That model
  exists because a combobox input must keep focus to receive typing. A menu has no such input.
  Real focus gives a screen reader the native item announcement and lets a row hold an
  interactive child. The cost is accepted: focus leaving the panel closes the menu.
- **Sharing `useListboxKeyboard`** — rejected: it is built around a combobox input and a virtual
  highlight, and its `role` cannot express `menu` (see
  `0026-menu-and-dropdown-are-separate-components.md`).
- **A roving hook shared with `Tree` and `Tabs`** — rejected as part of this decision. `Menu`,
  `Tree` and `Tabs` each own their small amount of focus code. Consolidating them into one
  internal hook is a separate decision that this ADR does not make.
- **Cloning the ref and handlers onto the trigger** — rejected: a trigger that does not forward a
  ref or spread unknown props, `Button` included, would silently lose them.
- **Closing the whole chain on Escape** (overriding `bubbles`) — rejected: Escape would close a
  popover that holds the menu when the user only meant to leave the menu.

## Consequences

- A consumer's trigger can be any node. A trigger that is not a single element receives the ARIA
  attributes on the wrapper `<span>`, the least-wrong place left.
- Moving focus out of the panel, by tabbing away or clicking elsewhere, closes the menu.
