---
status: accepted
---

# `DateTimeField` is a `DateField` and a `TimeField` that commit together

ADR-0025 named a `DateTimePicker` among the Wave 4 components. The date-time control that ships is
`DateTimeField`: a `DateField` and a `TimeField` side by side, editing one `LocalDateTime`. This
records the name and the rule that decides when it reports a value.

## Decision

**The name is `DateTimeField`.** ADR-0025 rejected a separate `DatePicker` because `DateField`
already owns the text entry, the calendar button and the `Popover`: `DateField` is the date picker.
The date-time control follows the same reasoning and the same naming as its siblings, `DateField`
and `TimeField`. Its date half is a `DateField`, so the calendar pop-up is already there.

**The value is a `LocalDateTime`.** `value`, `defaultValue` and `onChange` carry a `LocalDateTime`
from `@vipengele/ts`, or `undefined` for an empty field, as ADR-0025 fixes for the date-time type.

**`onChange` fires only when both halves are committed.**

- With both halves filled and in range, `onChange` reports the joined date-time, unless it is the
  value already committed.
- Emptying either half of a complete value commits `undefined`.
- A field with one half filled reports nothing. No default time is invented for a date on its own,
  and no date for a time.
- A half-filled field is flagged `aria-invalid` on both halves once focus leaves the whole group,
  and not while focus moves between the halves. Focus re-entering the group, through the calendar
  pop-up's portal included, clears the flag.
- Both halves filled with a date-time outside `min` and `max` report nothing, leave the committed
  value standing, and flag both halves invalid at once.
- `min` and `max` bound the date-time as a whole. The date half always takes their dates. The time
  half takes a bound's time only while the chosen date is that bound's date, since every time of a
  date strictly between the bounds is in range. With no date chosen neither time bound applies.
- A committed value that differs from the one the halves were last seeded from or last reported
  reseeds both halves. A controlled `value={undefined}` beside a half-filled field is the field's
  own empty value and leaves the filled half in place.

**One hidden input carries the form value.** Neither half carries a `name`. A hidden input holds the
caller's `name` and the ISO 8601 date-time (`2026-10-01T14:30`, with `:ss` when the second is
non-zero), mirrors `disabled`, and is empty while there is no value.

**`required` and `readOnly` are omitted.** `TimeField` has neither, and a prop the date half would
honour and the time half would ignore describes a field that behaves two ways at once.

## Considered options

- **A default time of `00:00` or the current time when only the date is filled.** Rejected: it
  reports a value the user never chose, and a midnight or "now" the user did not type is the wrong
  time more often than not. Reporting nothing until both halves are filled keeps `onChange` honest.
- **Emitting partial values, or a `{ date, time }` object.** Rejected: every consumer would validate
  for an incomplete state and re-join the halves, and the object is a second value type beside the
  `LocalDateTime` ADR-0025 settled on.
- **A separate `DateTimePicker`.** Rejected for the reason ADR-0025 rejected `DatePicker`: the date
  half is already the picker, so a second component adds a name and a surface for no behaviour the
  field lacks.
- **`dateProps` and `timeProps` passthrough.** Rejected: it makes both halves' full prop surfaces
  part of this component's contract, including props whose meaning changes when two fields edit one
  value (`min`, `max`, `value`, `onChange`). The props that make sense for both halves are named on
  the field.
- **Two named form inputs rather than one hidden ISO input.** Rejected: a server would have to join
  a date and a time, which is the locale-string parsing the hidden-input shape of ADR-0035 exists to
  avoid.
- **`required` and `readOnly` props.** Rejected: `TimeField` lacks both, so the time half could not
  honour them.
