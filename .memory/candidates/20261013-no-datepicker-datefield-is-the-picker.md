---
about: there is no DatePicker component and ADR-0025 rejected one; DateField is the picker, so a DateTimePicker composes DateField + TimeField, and nothing in the repo specifies DateTimePicker beyond its name and the LocalDateTime type
saw:
  - docs/adr/0025-date-and-time-are-zoneless-local-values-from-ts.md
  - source/react-ui/packages/ui/src
  - source/react-ui/packages/ui/AGENTS.md
  - CONTEXT.md
---

Checked 2026-10-13.

- `ls source/react-ui/packages/ui/src` shows Calendar, DateField, TimeField and no DatePicker.
- ADR-0025 "Considered options" (line ~108) rejects "A separate `DatePicker` component composed of `DateField` and `Calendar`": DateField already owns text entry, calendar button and Popover.
- ADR-0025 line 7 names `DateTimePicker` as a Wave 4 component and line 27 fixes its value as `LocalDateTime`; that is all.
  `grep -rn "DateTimePicker\|LocalDateTime" docs CONTEXT.md source/*/packages/*/AGENTS.md` finds only ADR-0025 and the CONTEXT.md "Local value" entry (line 299). No ADR/AGENTS text on abandoned attempts or composite-component conventions.
- ADR-0025 hidden-input rule: ISO `2026-10-01T14:30` under the caller's `name`, visible controls carry no `name`; commit-only `onChange`; prop is `onChange`, not `onValueChange`.
- A DateTimePicker built from DateField + TimeField would contain two hidden inputs unless the composite suppresses the children's `name` and emits one.
