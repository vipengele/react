# Dropdown and Autocomplete track the highlighted option via `aria-activedescendant`, not real DOM focus

Autocomplete's text input must keep real DOM focus while the user types, so its highlighted
listbox option can only be tracked virtually — a `highlightedIndex` state plus
`aria-activedescendant` pointing at that option's id, per the WAI-ARIA combobox pattern. Dropdown
has no text input to protect and could instead move real DOM focus into its listbox items
(roving tabindex, the model Tabs already uses for its tab list). We use `aria-activedescendant`
for both anyway, so the two components share one internal keyboard-handling hook rather than
Dropdown needing its own roving-tabindex implementation alongside Autocomplete's activedescendant
one. This also generalizes to multi-select without extra work: toggling a checkbox on `Enter`/
`Space` never needs to move focus off the trigger or input.

## Considered options

- **Roving tabindex for Dropdown, `aria-activedescendant` for Autocomplete.** Matches each
  component's constraints most directly, but means two separate keyboard-handling
  implementations to write and test instead of one shared hook, for a distinction (real focus
  vs. virtual focus) most consumers never observe.

## Amended by ADR 0013

This model stands: the highlighted option is tracked virtually, and real DOM focus never enters
the listbox, in every mode either component ever had. ADR 0013 introduces a second element that
can hold that real focus in place of the reference element — a search input inside the floating
element, in `Dropdown`'s search mode — so "the reference element" in the paragraph above is one of
two elements now, chosen by mode, rather than always the same one. Neither element is ever the
listbox itself.
