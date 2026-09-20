# Dropdown is the one searchable combobox; Autocomplete is gone

`Dropdown` and `Autocomplete` are two components with one keyboard model
(`docs/adr/0004-aria-activedescendant-for-dropdown-and-autocomplete.md`) and one compound-children
shape (`docs/adr/0005-dropdown-autocomplete-compound-option-children.md`) built around a
distinction — a filtering text input versus a non-filtering trigger — that most consumers never
choose on purpose: they reach for whichever one they saw first and discover the other only when
they need the feature it has. `Dropdown` gains a search row. `Autocomplete` is deleted, and every
behaviour it had becomes a `Dropdown` mode rather than a separate export.

**The decision: one component, `Dropdown`, searchable by default.** `searchable={false}` renders
today's `Dropdown` exactly — no search row, typeahead on the trigger. The default renders a search
row as the popover's first line: a `Search` magnifier on the left, the `searchPlaceholder` hint
(default `"Search"`), then a divider, then the options.

## The field fills its container

The root becomes `display: block; width: 100%`, like `TextField`. The `min-width: min(12rem,
100%)` floor and `max-width: 100%` ceiling that `docs/adr/0011-the-field-shell-as-keystone.md`'s
width section gave the shrink-to-fit root go with it: a block box sized to its container never
needs either bound, so the field never widens as options are selected and never narrows below its
container either.

## Values are objects everywhere

Sync and async modes take and return the same shape: `{ value, label, icon? } | null` for single
selection, and arrays of it for multi. Identity is the `value` string, never the object reference,
so a consumer that re-creates the value object on every render keeps its selection. In sync mode a
matching `Option` child's label and icon win over the value object's own — the value's label is
only a fallback when nothing matches — and in async mode, where no `Option` children exist to
match against, the value's own label is what renders. `onChange` always hands back the full option
object, never a bare `value` string.

## The focus model

The trigger stays floating-ui's `elements.domReference` for the whole lifecycle, search mode
included. On open, search mode wraps the floating element in a **non-modal** `FloatingFocusManager`
with `initialFocus` on the search `<input>` — a sibling of the listbox inside the floating element,
not the reference. That moves real DOM focus into the input while the trigger keeps every role
floating-ui reads off `domReference`: its typeable-combobox check, its close-time `.focus()` call,
and `useClick`'s Space handling.

The search input drives navigation through floating-ui's own reference prop getter, not through
keys forwarded by hand to a separate handler. `useListNavigation`'s `commonOnKeyDown` gates its one
`currentTarget` check on `!virtual`, so virtual navigation has no dependency on the handling
element being `domReference`. `isTypeableCombobox(domReference)` is `false` for the trigger's `div
role="combobox"`, which is exactly what keeps `aria-activedescendant` available in the reference
prop getter to hand to the input. `docs/adr/0004-aria-activedescendant-for-dropdown-and-autocomplete.md`'s
model is kept, not overturned: real DOM focus still never enters the listbox. What moves is which
element holds real focus and therefore carries the highlight's id — the trigger in every other
mode, the search input in search mode.

Two consequences follow, and neither is free:

- The search input's prop getter withholds `useClick`. Its reference press handler toggles the
  listbox open and shut, and a press placing the caret in the search input would close the popover
  that input lives in.
- In search mode the outside press that closes the listbox is the `click`, not the `pointerdown`
  that opens or moves focus. `FloatingFocusManager` returns focus to the trigger as the floating
  element unmounts; closing on `pointerdown` would put that return ahead of `mousedown`'s own
  default action, blanking focus to `<body>` when the press landed on something unfocusable.
  Closing on `click` lets the browser's own focus move happen first and the manager's return happen
  last. Escape, selecting an option and an outside press all return focus to the trigger, and this
  is why an outside press manages to.

`searchable={false}` uses no focus manager at all: the trigger keeps real focus throughout, exactly
as `docs/adr/0004-aria-activedescendant-for-dropdown-and-autocomplete.md` already described.

## ARIA placement

The trigger keeps `role="combobox"`, `aria-expanded` and `aria-controls` pointing at the listbox,
plus the name and description `FormField` forwards. The search input is also `role="combobox"`,
with `aria-autocomplete="list"`, `aria-expanded="true"`, its own `aria-controls` pointing at the
listbox and `aria-activedescendant` tracking the highlight, named by `searchPlaceholder`. This is
the cmdk/shadcn pattern: two combobox roles cooperating, one holding the accessible name and
description, the other holding the live navigation state.

## The search flow

A printable key on the closed trigger opens the popover and seeds the search with that character.
A multi-select pick keeps the popover open and clears the query, so the next character starts a
fresh search over the full option list rather than filtering the picked option's own remaining
match. In `multiple` mode, Backspace in an empty search removes the last selection; a single
selection has no last selection distinct from its only one, and emptying that one is what
`clearable` is for. The query clears whenever the
popover closes. Typeahead — jumping the highlight by typing a matching label with no input to
type into — applies only when `searchable={false}`; a search input already owns every keystroke
once one exists.

## Grouping

A `Dropdown.Group label` compound child groups sync options; an async result may carry a `group?:
string`, and groups appear in first-arrival order with ungrouped results first. Group labels are
never navigation items, so the flat option index arrow keys traverse is unchanged by their
presence. Each group is `role="group"`, labelled by its own heading, with a separator between
groups drawn automatically rather than declared by the consumer. A group with no matching option
while searching hides entirely. A `Group` nested inside a `Group` throws, the same runtime
validation `docs/adr/0003-card-compound-components-with-runtime-validation.md` established for
unexpected compound children elsewhere in the package.

## One chip row, measured and collapsed

Multi-select keeps its chips on one row by default. Chips that do not fit are measured and
collapsed into an overflow chip, recomputed before paint on resize; a single chip wider than the
field shows alone, ellipsised. `wrapChips` (default `false`) wraps chips onto additional rows
instead of collapsing them.

The overflow chip reads "and N more," is not focusable, and shows the hidden labels in the
existing `Tooltip` on hover. `Tooltip` clones `aria-describedby` onto its single child and wires a
focus handler, both useless on a chip that never receives focus, so the trigger's accessible
description names every selection through separate wiring, merged with the `aria-describedby` ids
`FormField` forwards for hint and error rather than replacing them. A hidden selection is removed
by unchecking it in the popover, since the chip carrying it is not on screen to remove it from.

## `clearable`

`clearable` (default `false`) renders a focusable "Clear selection" `<button>` in the field shell's
trailing slot, after the chevron, present only while something is selected. `onFieldMouseDown`
skips a press that lands on a button (`target.closest("button")` in `useListboxKeyboard.ts`), so
the clear button does not open the list on press. Focus goes to the trigger afterward, and the
button styles its own interactive state per
`packages/ui/.agents/rules/adornments-style-their-own-interactive-state.md`.

The two cannot be interleaved, because each sits where it does for a reason the other's position
would cost it. The chevron is inside the trigger, so that a press on it is a press on the combobox
and toggles the listbox the way a press on the trigger's text does; a chevron in the trailing slot
is reached by `onFieldMouseDown`, which only ever opens, so clicking it would stop closing an open
list. The clear button is in the trailing slot, because `FieldShell` reads focus, invalidity and
openness off its direct children, and a button among those children hands the whole field a focus
ring the moment it takes focus — a slot is a subtree those `> ` rules do not reach into. So the
chevron is a child of the trigger and the button a child of the slot the shell renders after it:
two different flex containers, whose contents no `order` or `flex-direction` can interleave.

## The trigger icon

The trigger's selected-option icon takes `width`/`height: var(--tandiko-icon-md)` (16px), matching
`.tandiko-listbox-option-icon` — the same icon at the same size in the trigger and in the list it
came from.

## Async options

`loadOptions`, `debounceMs`, `loadingMessage`, `errorMessage` and the no-results message move from
`Autocomplete` into `Dropdown` unchanged. `docs/adr/0006-autocomplete-async-loadoptions-owns-debounce-and-state.md`'s
debounce and out-of-order-response race token survive exactly as that ADR described them.

## What this supersedes and amends

- **Supersedes** the input-as-combobox shape entirely: `Autocomplete` and its text-input trigger
  are gone, and `Dropdown`'s non-input trigger is the one combobox shape the package ships.
- **Amends `docs/adr/0004-aria-activedescendant-for-dropdown-and-autocomplete.md`.** Its
  `aria-activedescendant` model stands; what it did not anticipate is a second element, the search
  input, that can hold real focus in place of the reference element depending on mode.
- **Amends `docs/adr/0005-dropdown-autocomplete-compound-option-children.md`.** `Dropdown.Group`
  joins `Dropdown.Option` as a compound child.
- **Amends `docs/adr/0006-autocomplete-async-loadoptions-owns-debounce-and-state.md`.** Its
  documented limitation — an initial value with no label to seed the input or a chip until
  something has actually been searched — is resolved: an async value carries its own label as part
  of the object, so the trigger renders it before any search has run.
- **Amends `docs/adr/0011-the-field-shell-as-keystone.md`'s width section.** The combobox fills its
  container the way `TextField` always has, rather than sitting between the shrink-to-fit root's
  `min-width: min(12rem, 100%)` floor and `max-width: 100%` ceiling that section introduced.
- Supersedes the wider feature plan's slice 5, "Autocomplete search-in-popover," and that plan's
  decision 11, "sync keeps bare strings" — both are settled by this ADR instead of by the plan that
  proposed them.

## Considered options

- **Swap the reference element to the search input while the popover is open.** Would let the input
  carry every role floating-ui reads off `domReference` directly, with no separate search-mode
  branch. Rejected: floating-ui reads `domReference` for the typeable-combobox check, the focus
  restore on close, and `useClick`'s Space handling, all three at the moment the reference changes.
  Swapping it mid-lifecycle changes all three at once, and nothing in the repo tests a reference
  that moves. Keeping the trigger as the reference for the whole lifecycle, with a search input
  that only ever adds navigation and role props through its own prop getter, needed no such swap.
- **"Sync keeps bare strings," with a `getOptionLabel` callback resolving a label from a plain
  `value`.** Would keep `Option` values simple strings and let a callback supply whatever label an
  async result or a stale value needs. Rejected in favour of the value object carrying its own
  label: a callback is one more prop a consumer has to remember to pass, exactly where an object
  makes remembering unnecessary, and it does nothing an object literal doesn't already do more
  directly.
- **A fixed maximum chip count**, e.g. showing at most three chips before an overflow indicator.
  Rejected because a fixed count is wrong for both a narrow field, where three chips already
  overflow, and a wide one, where three chips leave visible room the field could have used.
  Measuring what actually fits adapts to both without a number to tune.
- **Group labels as disabled indices in the flat option list**, reusing the existing
  `disabledIndices` mechanism instead of excluding them from the list. Rejected because a disabled
  index still occupies a navigation slot that `Home`/`End` and `loop` have to skip over, and a
  group heading is not an option a consumer could ever select if it weren't disabled — it should
  never have been a navigable index to begin with.
