---
about: what a 2D month grid inherits from Tree/Toolbar/Popover and what @vipengele/ts 0.1.0 does and does not give it
saw:
  - source/react-ui/packages/ui/src/internal/useRovingFocus.ts
  - source/react-ui/packages/ui/src/Tree/useTreeFocus.ts
  - source/react-ui/packages/ui/src/Toolbar/Toolbar.tsx
  - source/react-ui/packages/ui/src/Popover/Popover.tsx
  - source/react-ui/node_modules/.pnpm/@vipengele+ts-core-common@0.1.0/node_modules/@vipengele/ts-core-common/dist/types/date-time/local-date.d.ts
  - source/react-ui/node_modules/.pnpm/@vipengele+ts-core-common@0.1.0/node_modules/@vipengele/ts-core-common/dist/locale/locale.d.ts
  - docs/adr/0025-date-and-time-are-zoneless-local-values-from-ts.md
  - docs/adr/0044-roving-focus-is-a-keyboard-only-hook-the-caller-owns-the-tab-stop.md
---
Found while scoping Calendar (#75). No Calendar/date grid exists yet in ui src, storybook or ADRs beyond 0025;
ADR-0025 "Left to later decisions" leaves `min`/`max`/range validity to the Calendar/range issues.

Focus model
- `useRovingFocus` is 1-D: one orientation's arrow pair + Home/End, the off-axis pair "never handled"
  (`useRovingFocus.ts` options doc), queries DOM items, writes no tabindex (ADR-0044). It cannot do a 7-column
  grid (Up/Down = +-7 days, PageUp/PageDown = month, Shift = year). Calendar must own its keymap.
- Tree (ADR-0038, `useTreeFocus.ts`) is the precedent for a model-driven grid: tab stop derived from state
  (`tabbableRow`), DOM focus moved only `if (focusWithin)`, and `pendingFocusRef` + a layout effect focuses a
  target that was not mounted when the move was requested (`useTreeFocus.ts` pendingFocus effect, `focusElement`).
  A month change unmounts the focused day button; focus must be re-applied in a layout effect after the new
  month commits, and only when focus was inside the grid, or a background `value` update steals focus.
- Toolbar `handleFocus`: React onFocus bubbles out of portals through the component tree, so a roving
  container must check `event.currentTarget.contains(event.target)` before recording a tab stop
  (Toolbar.tsx handleFocus; candidate 20261010-aria-disabled-...). Relevant to a Calendar rendered in a
  portalled Popover whose DateField parent also has focus handlers.
- Pagination step buttons use native `disabled`, "so focus leaves a button that becomes disabled" (ADR-0043
  Consequences). A native-disabled Clear button that was just clicked loses focus; `aria-disabled` keeps it but
  needs `{ force: true }` in browser tests.

Popover (what DateField depends on)
- `Popover` defaults `modal`, wraps content in `FloatingFocusManager` with no `initialFocus` option exposed
  (`Popover.tsx` ~l.177): initial focus is the first tabbable in the panel, which for a Calendar is the
  previous-month button, not the tab-stop day. A DateField slice needs Calendar to expose a focus handle
  or accept `autoFocus`-style prop for its tab-stop day, or Popover needs an initialFocus prop.
  Focus returns to the trigger on close; Escape inside Calendar must not be handled by Calendar (the tree's
  useDismiss owns it). `modal={false}` has the focus-leaves-document gotcha (note
  non-modal-popover-closes-only-when-focus-lands-elsewhere).

@vipengele/ts 0.1.0 (read from the installed .d.ts, `exports` of `@vipengele/ts` re-export from `ts-core-common`)
- `Locale`: `firstDayOfWeek` IsoWeekday 1=Mon..7=Sun; `monthNames(style)` January first; `weekdayNames(style)`
  MONDAY first, not locale-first: the grid must rotate by `firstDayOfWeek - 1`. Both return fresh arrays each call
  (memoise per locale). `NameStyle` long|short|narrow.
- `LocalDate`: `of` (throws InvalidDateTimeError on impossible dates, range 0001-01-01..9999-12-31), `now(clock?)`,
  `compare` (static), `equals`, `dayOfWeek` (ISO 1..7), `lengthOfMonth`, plus/minusDays, plus/minusMonths (day
  clamps), `format(locale)`, `segments(locale)` ({type: year|month|day|literal, value}), `toString()` ISO.
  MISSING: plusYears/minusYears (year jump = plusMonths(12)), isBefore/isAfter (use compare), withDayOfMonth /
  first-of-month (use `LocalDate.of(y, m, 1)`), a week-of-year/ISO week number, a range helper.
- Trap: plus/minusDays/Months THROW InvalidDateTimeError at the 0001/9999 bounds; month-nav buttons and
  keyboard PageUp/Down near the bounds need a guard (disable the button) rather than a try/catch at render.
- Empty is `undefined` (ADR-0025), and `useControllableState` cannot express controlled-empty (see note
  use-controllable-state-cannot-express-controlled-empty); `NumberInput.tsx:223` uses `"value" in props`.
