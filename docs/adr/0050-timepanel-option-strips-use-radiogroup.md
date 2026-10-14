# `TimePanel`'s option strips are radiogroups with real-focus roving, not listboxes

`TimePanel` shows a time as horizontal strips of options: hours, minutes and, on a 12-hour locale,
AM/PM. Each strip holds a single choice, and a pick is committed by activating an option. This ADR
settles the role the strips and their options carry, and how focus moves through them.

## Decision

- **Radiogroup and radio.** Each strip is a `role="radiogroup"` named by an `aria-label`, and each
  option a `role="radio"` whose `aria-checked` marks the selected one. A strip is a single-choice
  set, which is what a radiogroup announces.
- **Real focus, roving tabindex.** Options take DOM focus. The panel is one tab stop: the focused
  option while focus is on the panel, else the selected option of the strip focused last. Left and
  Right move within a strip, Up and Down move to the adjacent strip's selected option, Home and End
  jump to a strip's ends, and Enter or Space picks. Arrow keys move focus only; they never pick, so
  a keyboard user can pass over options without committing a time.
- **Disabled options stay focusable.** They carry `aria-disabled`, as `Calendar`'s days and
  `Menu`'s rows do, so a keyboard user reaches them and can learn why they cannot be picked.

## Why not `listbox`

`role="listbox"` in this package means the `aria-activedescendant` pattern: focus stays on a
combobox input or trigger and the highlighted option is virtual
(`0004-aria-activedescendant-for-dropdown-and-autocomplete.md`). A `TimePanel` has no input to
keep focus, and its options are what the user focuses. `Menu` is the package's real-focus
composite (`0030-menu-moves-real-focus-and-roving-tabindex.md`), and the strips follow it. A
`listbox` whose options take real focus would break the contract that name carries here, and a
`listbox` pattern gives the strips no way to be several named groups of one panel.

## Considered options

- **`role="listbox"` with `aria-activedescendant`** — rejected: it needs a focus owner to hold the
  active descendant, and the panel has none. Making a strip the owner would give each of the three
  strips its own tab stop, and screen readers would announce a listbox with a highlighted option
  where the panel selects a time.
- **Native `<input type="radio">` per option** — rejected: each strip would be its own tab stop,
  and the arrow keys would pick as they move, so scrubbing through minutes would commit a time
  per key press.
- **`role="listbox"` with real focus on the options** — rejected: it contradicts the
  `aria-activedescendant` reading of `listbox` in this package, so two components with the same
  role would behave differently.

## Consequences

- The roving logic is hand-rolled in `TimePanel.tsx`, because `internal/useRovingFocus.ts`
  handles one arrow pair per container and the panel navigates in two dimensions, like
  `Calendar`'s `useCalendarFocus`.
- Each strip carries `tabIndex={-1}`: Chromium makes a scroll container with no tabbable
  descendant a tab stop of its own.
- Strips are scroll containers, so the focused option and each strip's selected option are scrolled
  into view with `nearest` alignment.
