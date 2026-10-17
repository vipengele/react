---
name: calendar-grid-markup-and-test-hazards
kind: gotcha
description: Calendar's table role=grid needs two reasoned biome-ignores, its repeated-key test strings trip noSecrets, a selected+disabled day needs its own higher-specificity rule, and February's row count depends on the locale's first weekday.
anchors:
  - path: source/react-ui/packages/ui/src/Calendar/CalendarCore.tsx
    blob: b25a269a6068
  - path: source/react-ui/packages/ui/src/Calendar/Calendar.stylesheet.ts
    blob: 6fb88dc89cce
  - path: source/react-ui/packages/ui/src/Calendar/Calendar.browser.test.tsx
    blob: 30fc3212bbfb
confidence: suspect
---

- The grid is a `<table role="grid">` with `<td role="gridcell">`, not divs. Biome's `noNoninteractiveElementToInteractiveRole` flags
  the table role (the two `biome-ignore` comments are at `CalendarCore.tsx:156` and `:263`), and the div alternative needs semantic
  elements plus `tabindex` on rows and the grid (8 errors). Role queries for rows need `{ hidden: true }` because a week that is
  entirely blank carries `aria-hidden`.
- Biome's `noSecrets` flags repeated-key strings such as `"{ArrowLeft}{ArrowLeft}"` in `Calendar.browser.test.tsx`; the test uses a
  small `press(key, times)` helper, and Shift is held across calls with `{Shift>}` … `{/Shift}`.
- A selected day that is also `aria-disabled` would take the full accent fill: `[aria-selected="true"]` and `[aria-disabled="true"]`
  tie, and the later wins. `Calendar.stylesheet.ts:162` has a `[aria-selected="true"][aria-disabled="true"]` rule for the accent
  wash. A forced hover in a browser test does not discriminate the `:not([aria-disabled])` scoping on the selected hover rule,
  because the new rule wins that tie anyway.
- Whether February needs 4 rows depends on the locale's first day: February 2027 is 4 weeks Monday-first and 5 Sunday-first
  (en-US). Geometry tests that want a 4-week month pick February 2026 under en-US.
- `Calendar` ignores a pick of the already-selected day (`Calendar.tsx:58`, `selected?.equals(date)`), so a host that closes on pick
  stays open when the user re-picks the current value. `RangeCalendar` has no such guard and fires `onChange` on every completing pick.
