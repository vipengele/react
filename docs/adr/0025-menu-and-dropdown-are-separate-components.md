# `Menu` and `Dropdown` are separate components

A `Dropdown` is a value picker: its trigger shows what was chosen, and choosing a row changes
that value. A `Menu` is an action list: its trigger stays the same, and activating a row fires a
handler. Both open a popup of rows from a trigger, which is why one reads as a mode of the other,
and why this ADR exists. A `Menu` is never a `Dropdown` mode, a `Dropdown` with different props,
or a `Dropdown` composed with a different row type.

## The test

If the trigger shows the result, it is a `Dropdown`. If the trigger does not change and the rows
do something, it is a `Menu`.

- "Sort by: Newest" opens a short list of choices and shows the one picked. It is a `Dropdown`,
  even with two options.
- A "View" button whose popup holds "Show grid lines" and "Show rulers" toggles is a `Menu`. Its
  rows may be `menuitemcheckbox` or `menuitemradio`, but the checked state belongs to the
  consumer's application, not to the menu as a form value, and the trigger never displays it.

The ARIA roles, the keyboard model and the absence of a search row follow from this test; none
of them is the test.

## Why `Dropdown` cannot carry a menu

- **Roles.** `Dropdown` is `combobox` → `listbox` → `option`, and its group rows are
  `role="group"`. A menu is `menu` → `menuitem`. `useListboxKeyboard` types its `role` as
  `"select" | "combobox"` and hands it to floating-ui's `useRole`, so a menu role cannot be
  expressed through it.
- **Value model.** Rows are selection-coupled: `getItemProps` carries `selected` and `active`, and
  the component's value, chips and `clearable` machinery exist to hold and display what was
  picked. A menu holds nothing and displays nothing.
- **Row validation.** `Dropdown` throws at render on any child that is not `Dropdown.Option` or
  `Dropdown.Group`, and the option rows are one flat index space shared by `listRef`,
  `disabledIndices` and the highlight. An action row or a separator admitted to that list breaks
  arrow navigation, `loop` and typeahead.
- **Chrome.** The trigger is a `<div role="combobox">` inside `FieldShell`, sized by the
  `vpg-field-shell-control` marker. A menu trigger is a button, or an icon button, outside any
  field.
- **Search.** The popup opens on a search row unless `searchable={false}`, and typing goes to it
  or to typeahead. Neither belongs on a menu.

## Left open

How `Menu` moves focus, its keyboard details, and whether it shares `useListboxKeyboard` or any
other `Dropdown` internals are the decision of the ADR that accompanies the `Menu` component.
ADR-0024 reserves the name and its stacking step, `menu` equal to `listbox`, and nothing else
about it is decided here.

## Considered options

- **A `Dropdown` mode for actions** (`<Dropdown mode="menu">`, or rows that take an `onSelect`
  and leave the value untouched) — rejected: it needs a second role set, a second row model, no
  `FieldShell` and no search row, which leaves nothing of the component shared except the popup.
  Every `Dropdown` consumer would also carry the props and types of a mode they never use.
- **One component that switches role from a prop** — rejected for the same reason, and because a
  role chosen by a prop makes the accessible behaviour depend on a flag a consumer can omit.
- **Leaving the boundary to the ARIA roles alone** — rejected: roles are what a consumer sees
  last. A test a consumer can apply before choosing a component is whether the trigger shows the
  result.
