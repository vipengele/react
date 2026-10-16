---
about: issue #80's DatePicker/DateTimePicker names do not exist and ADR-0025/0049 reject them; Calendar has a single-day selection hook with no range seam, and FormField/TimeField/DateField constraints a range variant inherits
saw:
  - docs/adr/0025-date-and-time-are-zoneless-local-values-from-ts.md
  - docs/adr/0049-datetimefield-naming-and-commit-rule.md
  - source/react-ui/packages/ui/src/Calendar/Calendar.tsx
  - source/react-ui/packages/ui/src/Calendar/useCalendarFocus.ts
  - source/react-ui/packages/ui/src/Calendar/calendarGrid.ts
  - source/react-ui/packages/ui/src/Calendar/Calendar.stylesheet.ts
  - source/react-ui/packages/ui/src/DateField/DateField.tsx
  - source/react-ui/packages/ui/src/TimeField/useTimeField.ts
  - source/react-ui/packages/ui/src/internal/useCalendarPopup.ts
  - source/react-ui/packages/ui/src/FormField/FormField.tsx
---
Read while answering an understanding question for issue #80 (range variants). No memory note covered it.

Naming / ADR
- `grep -rli "DatePicker\|DateTimePicker"` (excluding node_modules) hits only ADR-0025, ADR-0049, DateTimeField.tsx and a prior candidate. No such component exists.
  ADR-0025 "Considered options" rejects a separate `DatePicker`; ADR-0049 rejects `DateTimePicker`. The field is the picker (DateField = text input + calendar button + non-modal Popover).
  A range variant therefore follows the Field naming (DateRangeField etc.), not Picker, unless a new ADR reopens it.
- ADR-0025:36 says a range is `{ start, end }` of the same local type, empty is `undefined`, commit-only onChange, one hidden input with ISO. Lines 155-157 leave "Range validity (start<=end)" to the component issues; line 168-169 says whether start may follow end is not decided. So #80 must decide it (an ADR is the precedent, cf. 0049).
- ADR-0025:62-64 no zone / `timeZone` prop in any component. DateTimeField combines via `LocalDateTime.of(date, time)` (dateTimeFieldModel.ts:86,167,183); no zone code anywhere.

Calendar seam (Calendar.tsx)
- Selection is `useCalendarSelection` (Calendar.tsx:60-78), a private function in the component file: single `LocalDate | undefined`, `select`/`clear`, controlled iff `"value" in props` (:248). No `selectionMode`, no reducer; `useCalendarFocus` takes `selected: LocalDate` and `select(date)` (useCalendarFocus.ts:5-18) and `tabStop` takes `selected` (calendarGrid.ts:186). A range needs the selection hook generalised or a sibling component; it is not an additive prop.
- `CalendarDay` (Calendar.tsx:169) is not memoised and gets `selected` as a prop; a hover-end state held in Calendar re-renders all 42 cells per pointer move (inference from code, not measured).
- Only the visible month's cells render; adjacent-month cells are inert `aria-hidden` blanks (monthGrid, calendarGrid.ts:38-52), so in-range highlighting across a month boundary can only be drawn on cells of the visible month.
- Day state is styled from ARIA (`aria-selected`, `aria-current`, `aria-disabled`; Calendar.stylesheet.ts:130-155). A selected+disabled day has its own specificity-tie rule (:150-155); a range-start/end/in-range style must keep that tie in mind.
- Re-picking the selected day is a no-op and fires no onChange (Calendar.tsx:65), so a range host that closes on pick will not close on a repeat pick.
- Calendar uses `aria-disabled` not `disabled` for month buttons/Clear so focus is not dropped (Calendar.tsx:98-102, 333).

Field seams
- DateField is ONE text input with draft/commit logic (DateField.tsx:232-443), not segments; only TimeField has segments (TimeField.tsx, useTimeField.ts, timeSegments.ts). The reusable hooks are `useCalendarPopup` (internal, DateField + DateTimeField) and `useClearRejectedOnExternalChange`; `useTimeField` is a whole-field hook for one time, not a per-segment primitive.
- `useCalendarPopup` returns one `fieldRef`/`buttonRef`/`returnFocus`/month (useCalendarPopup.ts:48-62): one popup per field. A two-input range field either shares one popup or needs two.
- FormField clones id/aria-* onto ONE child element (FormField.tsx:37, 53-76, throws otherwise); a two-input range field has two controls, so it is group-shaped (FormField.tsx:24-28 says group components like RadioGroup use aria-label instead). TimeField's group (`role="group"`) is the FieldShell's marked control and is the element that receives FormField's props.
- Range validity precedent: TimeField min/max rejects on commit with aria-invalid, onChange not fired, text kept (AGENTS.md:136-149); a `min` after `max` is declared unsupported (AGENTS.md:149).

Conventions (unchanged, verified)
- Stylesheet: `<style href="vpg-x" precedence="vpg-x">` (Calendar.tsx:291, DateField.tsx:383, TimeField.tsx:126).
- No literal fallback in `var(--vpg-*)`: enforced by glob test src/no-fallback-var-reads.test.ts (ADR-0009).
- Coverage: ui gates 80% (ADR-0048; vitest.config.ts thresholds). `.lydite/components.yml` lists whole packages (ui is one component); a new component needs no entry. Each date component adds a marker to bundle-check/run.mjs (run.mjs:139-144; ADR-0025:94-97).
- Tests: `*.browser.test.tsx` go to the chromium project, everything else jsdom (vitest.config.ts:7-8, 24-30).
- Stories: apps/storybook/src/<Name>.stories.tsx (Calendar, DateField, DateTimeField, TimeField, TimePanel exist).
- Not checked: whether installed `@vipengele/ts` (^0.2.1, packages/ui/package.json:40) has a range type; node_modules is not installed in this checkout.
