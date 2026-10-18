---
status: accepted
---

# `DateTimeField` is one field shell with one input

ADR-0025 named a `DateTimePicker` among the Wave 4 components. The date-time control that ships is
`DateTimeField`: one `FieldShell` holding one text input that writes a date and a time in the
locale's own layout, editing one `LocalDateTime`. This records the name, the shape and the rule
that decides when it reports a value.

## Decision

**The name is `DateTimeField`.** ADR-0025 rejected a separate `DatePicker` because `DateField`
already owns the text entry, the calendar button and the `Popover`: `DateField` is the date picker.
The date-time control follows the same reasoning and the same naming as its siblings, `DateField`
and `TimeField`.

**The value is a `LocalDateTime`.** `value`, `defaultValue`, `onChange`, `min` and `max` carry a
`LocalDateTime` from `@vipengele/ts` (or `undefined` for an empty field), as ADR-0025 fixes for the
date-time type.

**One shell, one input.** A single `FieldShell` holds one text `<input>` with a calendar button at
its start and a clear button at its end. The text is a date and a time in the order and patterns
the locale writes them (`10/15/2026 09:05 PM` in `en-US`, `15.10.2026 21:05` in `de-DE`); the
placeholder spells that format and `aria-description` states the order of its fields. The calendar
button opens a non-modal `Popover` holding a `Calendar`, a `TimePanel` and a Done button. `ref` and
the native attributes land on the visible input.

**The text is read through `@vipengele/ts`.** It is written from `LocalDate#format` and
`LocalTime#format`, ordered by `LocalDateTime#segments`, and read back with `tryParseLocalized`:
the field's own layout first, then the locale's combined `LocalDateTime#format` layout, then ISO
8601, so a pasted value reads in every locale. The seconds are never written, and a committed value
that carries them keeps them while its text is untouched. Whether the time comes first is read
from the first non-literal segment of `LocalDateTime#segments`, so the field holds no layout of
its own and imports nothing but `@vipengele/ts`.

**`onChange` fires on commit, and only for a whole date-time.**

- Typed text commits on blur or Enter, never per keystroke. Text that reads as a date-time inside
  `min` and `max` reports it, unless it is the value already committed. Whitespace-only text
  reports `undefined`.
- Text that reads as no date-time, or as one outside the bounds, reports nothing, leaves the
  committed value standing, stays on screen and flags the input `aria-invalid`.
- A day picked in the calendar takes the committed time and commits when that lands inside the
  bounds. With no committed value, or when the committed time is ruled out on that day, the day is
  pending: the box shows it, nothing commits, and the next picked time commits the two together. No
  time is invented for a date on its own.
- A pending day flags the field `aria-invalid` only once focus has left the whole field, the
  pop-up included, so a user on the way from the calendar to the time panel is not flagged.
- `min` and `max` bound the date-time as a whole. Their dates bound the calendar. A bound's time
  disables times in the panel only on that bound's own date, since every time of a date strictly
  between the bounds is in range. With no day chosen the panel is disabled.
- A controlled value that moves on beneath an unfocused field replaces a rejected draft and a
  pending day alike.

**One hidden input carries the form value.** The visible input carries no `name`. A hidden input
holds the caller's `name` and the ISO 8601 date-time (`2026-10-15T21:05`, with `:ss` when the
second is non-zero), mirrors `disabled`, and is empty while there is no value.

## Considered options

- **A `DateField` and a `TimeField` side by side.** Rejected: two shells, two inputs and two
  focus scopes for one value. Each half commits on its own clock, so the field needs a rule for
  the state between them (one half filled), has to reseed both halves when the value moves, and
  must forward `aria-invalid`, labels and `id` to two controls. The user sees two fields where the
  locale writes one date-time. One input owns one draft, one commit and one invalid state.
- **A default time of `00:00` or the current time when only the date is picked.** Rejected: it
  reports a value the user never chose, and a midnight or "now" the user did not type is the wrong
  time more often than not. A pending day reports nothing until a time is picked.
- **Emitting partial values, or a `{ date, time }` object.** Rejected: every consumer would
  validate for an incomplete state and re-join the parts, and the object is a second value type
  beside the `LocalDateTime` ADR-0025 settled on.
- **A separate `DateTimePicker`.** Rejected for the reason ADR-0025 rejected `DatePicker`: the
  field is already the picker, so a second component adds a name and a surface for no behaviour
  the field lacks.
- **Two named form inputs rather than one hidden ISO input.** Rejected: a server would have to join
  a date and a time, which is the locale-string parsing the hidden-input shape of ADR-0035 exists
  to avoid.
- **A `seconds` prop.** Rejected: the text writes the hour and the minute, and the time panel
  picks on a minute grid. A second the value carries is kept while the text is untouched.
