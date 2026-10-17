---
name: datefield-is-the-picker-no-datepicker
kind: rationale
description: "There is no DatePicker or DateTimePicker component: ADR-0025 and ADR-0049 reject them because DateField (text input + calendar button + Popover) is the picker, so range and composite variants follow the Field naming."
anchors:
  - path: docs/adr/0025-date-and-time-are-zoneless-local-values-from-ts.md
    blob: c00e96fd023e
  - path: docs/adr/0049-datetimefield-naming-and-commit-rule.md
    blob: 075a8c13af56
  - path: source/react-ui/packages/ui/src/DateField/DateField.tsx
    blob: b08bcd6cad8d
confidence: suspect
---

`ls source/react-ui/packages/ui/src` shows DateField, DateTimeField, DateRangeField, DateTimeRangeField, TimeField, TimeRangeField,
RangeCalendar and no DatePicker. ADR-0025
"Considered options" rejects a separate `DatePicker` composed of `DateField` and `Calendar` because DateField already owns text
entry, the calendar button and the Popover; ADR-0049 rejects `DateTimePicker` in favour of `DateTimeField`. Issue text that still
says DatePicker or DateTimePicker is out of date, and a range variant follows the Field naming (DateRangeField etc.) unless a new
ADR reopens it.

ADR-0025 also fixes: a range is `{ start, end }` of the same local type, empty is `undefined`, `onChange` is commit-only, and one
hidden input carries ISO text under the caller's `name` while visible controls carry none. Range validity (start ≤ end) is left to
the component issues (ADR-0025 "Left to later decisions"), so a range component must decide it. A composite built from two fields
would contain two hidden inputs unless it suppresses the children's `name` and emits one. Not re-read in this pass: whether the
installed `@vipengele/ts` has a range type.
