---
about: putting the search input inside the floating popover collides with useListboxKeyboard's requirement that elements.domReference be the focusable, typeable control
saw:
  - packages/ui/src/internal/useListboxKeyboard.ts
  - handoff/reference/PLAN-design-substrate-and-form-control-rebuild.md
  - docs/adr/0004-aria-activedescendant-for-dropdown-and-autocomplete.md
---

The plan for merging `Autocomplete` into `Dropdown` (`PLAN-design-substrate-and-form-control-
rebuild.md:52-60`) asserts ADR 0004 "survives, and is more necessary — real focus must stay in
the popover's search input," and that the trigger becomes a non-input `FieldShell` button with
the search input as the popover's first row.

That is a different claim from what the current hook implements. `useListboxKeyboard.ts:80-84`
and `:220` (`elements.domReference?.closest(".tandiko-root")`) plus the already-staged candidate
`listbox-dom-reference-carries-interaction-not-position.md` establish that `refs.setReference`
(→ `elements.domReference`) must be the actual focusable/typeable control, not merely "wherever
real focus currently is": `useListNavigation` reads it to decide typeable-combobox handling, its
close path calls `.focus()` on it, and `useClick` checks it for space-key handling — all reads
from floating-ui's own source, not from a local test.

If the trigger (a button-like `FieldShell` child, always rendered, outside the popover) is
`domReference`, but real keyboard focus is meant to live on a search `<input>` that only exists
while the popover is open and lives inside the floating tree, those are two different elements.
Nothing in the current hook, ADR 0004, or the plan resolves which one `setReference` points to
once search moves into the popover — it must be one or the other:

- keep `domReference` on the trigger button and never actually focus the search input (matches
  today's Dropdown model, but then the input can't take real keystrokes without a second,
  separate interaction layer), or
- move `domReference` onto the search input itself once mounted (satisfies typing, but the
  trigger then can't be `domReference` while closed, so `useClick`'s open-on-click and the
  close-path `.focus()` target change between open and closed states — untested territory, since
  every existing `useListboxKeyboard` caller has exactly one `domReference` for the component's
  whole lifecycle).

`FloatingFocusManager` is not the fix either: `useListboxKeyboard.ts:76-78`'s docstring says it's
deliberately absent because moving real focus into the floating element breaks the
`aria-activedescendant` virtual-focus model this hook is built around. `Popover.tsx:131` is the
only place it's used in this package, and it's a modal-panel pattern, not a listbox one — no
prior art in this repo for a combobox whose reference element toggles between "outside the
popover" (closed) and "inside the popover" (open).
