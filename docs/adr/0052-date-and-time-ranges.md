---
status: accepted
---

# Date and time ranges are sibling components with ordered, whole-or-nothing values

ADR-0025 fixed that a range is `{ start, end }` of the same local type and left range validity to
the component issues. The range controls that ship are `RangeCalendar`, `DateRangeField`,
`TimeRangeField` and `DateTimeRangeField`. This records their names, the validity rule, the shape of
a range field, how it submits in a form, how it is named for assistive technology and who owns the
range types.

## Context

`DateField`, `TimeField` and `DateTimeField` each edit one local value and are the pickers
(ADR-0025, ADR-0049). A range edits two of them at once, so four questions have no answer in the
single-value decisions: whether a range may run backwards, what a half-filled range reports, how
two controls sit under one `FormField` label, and what the form submits. Each answer is public API
and costly to change once consumers rely on it.

## Decision

**The scope is four components.** `RangeCalendar`, `DateRangeField`, `TimeRangeField` and
`DateTimeRangeField`. There is no range `TimePanel`: a time range is chosen in the fields or in the
panels of `DateTimeRangeField`. No component carries a `*Picker` name; the field is the picker, as in
ADR-0025 and ADR-0049.

**`RangeCalendar` is a sibling of `Calendar`.** The month grid, the focus handling and the day cell
are an internal core that both components wrap. `Calendar` takes no `selectionMode` prop and keeps
its single-day contract.

**A committed range always has `start <= end`.** `start == end` is valid. A time range never wraps
midnight: an end earlier than its start is reversed, not "tomorrow".

- In `RangeCalendar` the first pick anchors, the second pick completes, and a second pick earlier
  than the anchor swaps the two so the earlier day is the start.
- In a field, an end before the start is rejected exactly like an out-of-bounds value: the editor is
  `aria-invalid`, `onChange` does not fire, and the draft stays on screen. A field never reorders
  what the user typed.

**A range field is two editors in one shell.** One `FieldShell` holds a start editor and an end
editor; the shell's marked control is a `role="group"`. The editors' accessible names default to
"Start" and "End" and are overridable through `startLabel` and `endLabel`.

- `onChange` fires only when both ends are committed and ordered, and with `undefined` when both
  are cleared. An empty range is `undefined`, as in ADR-0025.
- A half-filled range is incomplete: the field is `aria-invalid`, nothing commits and the value
  already committed stands.
- There are no open-ended ranges. A range has both ends or neither.

**A range submits as two hidden inputs.** `startName` and `endName` each render one hidden input
carrying that end's canonical ISO 8601 string (ADR-0025). A prop that is absent renders no input. The
visible editors carry no `name`, and the range field props type omits `name`: the field has no single
value to submit under it.

**`DateTimeRangeField` pops up a calendar and two time panels.** The non-modal `Popover` holds a
`RangeCalendar`, a `TimePanel` for the start time, a `TimePanel` for the end time and a Done button.
ADR-0049's pending rule extends to the whole range: nothing commits until both days and both times
are usable and ordered. An end time before the start time on the same day is invalid, not swapped.

**`RangeCalendar` exposes its pending start.** Besides `value`, `defaultValue` and `onChange`, it
takes `anchor?: LocalDate` and `onAnchorChange?(anchor: LocalDate | undefined)`. The anchor is the
controlled pending start and is drawn as an endpoint. The first pick sets the anchor and fires
`onAnchorChange`, not `onChange`; the second pick completes the range, fires `onChange` and clears
the anchor. A field uses the pair to show a typed-only start in the calendar and to fill its start
editor on the first pick.

**Disabled days may lie inside a range.** `min`, `max` and `isDateDisabled` refuse a day only as an
endpoint. A span may cross days they rule out, which stay unselectable as endpoints.

**Names compose from the group and the editor.** The outer `role="group"` takes `FormField`'s label,
since `FormField` decorates exactly one child. Each inner editor is named by `aria-labelledby`
referencing the group's label and its own "Start" or "End" label, so two range fields on one page
stay distinguishable ("Stay, Start" and "Stay, End"). The inner editors of `TimeRangeField` keep
their own `role="group"`, so its groups nest.

**The range types belong to `react-ui`.** `LocalRange<T>` is `{ readonly start: T; readonly end: T }`
and stays internal. The exported types are the aliases `DateRange`, `TimeRange` and `DateTimeRange`.
No public signature names or re-exports a range type of a dependency, `@vipengele/ts` included, so
the contract does not move when a dependency adds or changes one.

## Consequences

- A consumer receives a range that is already ordered and whole, so it validates nothing and
  re-sorts nothing. The cost is that a field never accepts an unordered or half-open range, and a
  product that needs one builds it from two single-value fields.
- A reversed entry in a field is a visible error the user corrects, while the same gesture in the
  calendar is absorbed by the swap. The two surfaces differ on purpose: a click carries no intent
  about order, typed text does.
- A server reads two ISO strings and joins nothing, at the price of two form keys per range.
- `Calendar` stays small and its tests stay as they are; the shared core is a second module to
  keep in step with both wrappers.
- `RangeCalendar` carries an anchor API that single-value `Calendar` has no counterpart for.
- A range of `LocalDate`, `LocalTime` or `LocalDateTime` is a `react-ui` type; converting to a
  dependency's range type is the consumer's call.

## Considered options

- **A `selectionMode="range"` prop on `Calendar`.** Rejected: the value, `onChange` and the
  selection state change type with the mode, so the props become a union that narrows on a flag
  and every consumer of `Calendar` pays for range handling it never uses. A sibling keeps each
  contract plain.
- **Flag an unordered range but commit it.** Rejected: `onChange` would report a value that breaks
  the `start <= end` invariant, and every consumer would re-check it. A field reports a value it
  would accept, as the bounds of ADR-0025 already do.
- **Swap the ends in a field.** Rejected: the user typed two values in two places, and moving one
  into the other editor rewrites text they did not touch. In the calendar a pick is a position, not
  text, so the swap loses nothing.
- **One combined text input for the range.** Rejected: it needs one parser for two locale-formatted
  dates and a separator the locale may already use, it has no per-end invalid state, and its caret
  and arrow keys have no natural boundary between the ends.
- **One hidden input under `name` carrying an ISO interval (`start/end`).** Rejected: a server
  would split a string, which is the parsing the hidden-input shape of ADR-0025 exists to avoid, and
  an interval has no form for a missing end or a local time. Two named inputs map onto two columns.
- **Open-ended ranges, with `start` or `end` alone.** Rejected: every consumer would handle four
  shapes instead of two, and "no end" has no agreed spelling in the editors. A half-filled field is
  incomplete, and a product that wants an open end models it beside the field.
- **`DateRangePicker`, `TimeRangePicker`, `DateTimeRangePicker`.** Rejected for the reason ADR-0025
  rejected `DatePicker` and ADR-0049 rejected `DateTimePicker`: the field already owns the text
  entry and the popup.
- **A `name` prop on the range fields.** Rejected: there is no single value to submit, and a
  `name` that quietly meant "start" or "both" would be guessed at.
- **Wrapping a time range past midnight.** Rejected: an end earlier than the start would read as
  the next day, which the zoneless `LocalTime` cannot carry, and the entry that is a typo today
  would commit as a 23-hour span.
- **Refusing a span that crosses a disabled day.** Rejected: `isDateDisabled` describes days that
  cannot be an endpoint, such as a closed office, and a stay or a leave runs across them. A product
  that forbids crossings validates the committed range itself.
- **Re-exporting the range type of `@vipengele/ts`.** Rejected: it would put a dependency's type
  in the public signatures, so a change there becomes a breaking change here.
