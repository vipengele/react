---
about: FieldShell's trailing slot is excluded from the shell's direct-child state selectors, which is what lets an adornment placed there carry its own focus ring independent of the field's
saw:
  - source/react-ui/packages/ui/src/FieldShell/FieldShell.tsx
  - source/react-ui/packages/ui/src/FieldShell/FieldShell.stylesheet.ts
  - source/react-ui/packages/ui/src/Dropdown/Dropdown.tsx
  - source/react-ui/packages/ui/src/Dropdown/Dropdown.browser.test.tsx
---

`FieldShell` renders an optional `trailing` prop into `<span className="vpg-field-shell-
trailing">` (`FieldShell.tsx:64`). The shell's state rules are direct-child selectors that
explicitly exclude both slots: `.vpg-field-shell > *:not(.vpg-field-shell-leading,
.vpg-field-shell-trailing)` (`FieldShell.stylesheet.ts:54`) and the "last non-slot child"
selector at `:67`. `.vpg-field-shell-trailing` itself (`:72`) is a plain layout rule with no
focus/open/invalid/disabled state wiring.

`Dropdown` passes its clear button into that slot: `trailing={showClear ?
renderClearButton() : undefined}` (`Dropdown.tsx:1043`). The button draws its own
`:focus-visible` ring at `Dropdown.stylesheet.ts:122-125`, independent of the shell's. Verified
live in `Dropdown.browser.test.tsx:797-825`: tabbing from the trigger to the clear button leaves
the field's `borderColor`/`boxShadow` back at their resting values (`:822-823`) while the button
itself gains `outlineStyle: "solid"` (`:824`) — the comment at `:818-819` states the mechanism
directly: "The button sits in the trailing slot, which the shell's `> ` state rules do not reach
into: the field reads as untouched while the button carries the ring itself." Ran this test this
session; it passes.

This generalizes `field-shell-control-must-be-direct-child`'s direct-child rule: the trailing (and
leading) slot is the one place inside the shell an element can hold its own interactive state
without the shell's rules either applying to it or being defeated by it.
