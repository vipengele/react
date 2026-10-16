---
about: issue #80's DatePicker/DateTimePicker names do not exist and ADR-0025/0049 reject them; Calendar's grid is a shared core that RangeCalendar wraps, and FormField/TimeField/DateField constraints a range variant inherits
saw:
  - docs/adr/0025-date-and-time-are-zoneless-local-values-from-ts.md
  - docs/adr/0049-datetimefield-naming-and-commit-rule.md
  - source/react-ui/packages/ui/src/Calendar/Calendar.tsx
  - source/react-ui/packages/ui/src/Calendar/CalendarCore.tsx
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

Calendar seam (Calendar.tsx, CalendarCore.tsx)
- `Calendar.tsx` holds only `useCalendarSelection` (single `LocalDate | undefined`, `select`/`clear`, controlled iff `"value" in props`) and the Clear footer; the month grid, header, focus and day cells are `CalendarCore.tsx`, which takes `tabStopAnchor`, `dayMarks`, `onPick` and `footer`. `useCalendarFocus` takes `anchor`/`pick` and `calendarGrid.tabStop` takes `anchor`. `RangeCalendar` wraps the same core.
- `CalendarDay` (CalendarCore.tsx) is not memoised and gets its `dayMarks`; a hover-preview state held above it re-renders all 42 cells per pointer move (inference from code, not measured).
- Only the visible month's cells render; adjacent-month cells are inert `aria-hidden` blanks (monthGrid, calendarGrid.ts), so in-range highlighting across a month boundary can only be drawn on cells of the visible month.
- Day state is styled from ARIA and `data-*` attributes (`aria-selected`, `aria-current`, `aria-disabled`; Calendar.stylesheet.ts). A selected+disabled day has its own specificity-tie rule; the range stylesheet scopes every rule under `.vpg-range-calendar` with higher specificity than the Calendar rule it overrides.
- Re-picking the selected day is a no-op in `Calendar` (Calendar.tsx:58) but not in `RangeCalendar`, whose completing pick always fires `onChange`.
- Calendar uses `aria-disabled` not `disabled` for month buttons/Clear so focus is not dropped (CalendarCore.tsx header, Calendar.tsx footer).

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
