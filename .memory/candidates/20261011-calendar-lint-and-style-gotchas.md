---
about: Calendar's grid markup, its browser-test key strings and its disabled-selected styling each hit a repo rule that is easy to trip again
saw:
  - source/react-ui/packages/ui/src/Calendar/Calendar.tsx
  - source/react-ui/packages/ui/src/Calendar/CalendarCore.tsx
  - source/react-ui/packages/ui/src/Calendar/Calendar.stylesheet.ts
  - source/react-ui/packages/ui/src/Calendar/Calendar.browser.test.tsx
  - source/react-ui/biome.json
---
Found while building and reviewing `Calendar` (#75).

- The grid is a `<table role="grid">` with `<td role="gridcell">`, not divs. Biome's
  `noNoninteractiveElementToInteractiveRole` flags the table role, and the div alternative needs semantic
  elements plus `tabindex` on rows and the grid (8 errors), so `CalendarCore.tsx` keeps the table with two
  `biome-ignore` comments that give reasons, as Disclosure and SideNav do. Role queries for rows need
  `{ hidden: true }` because a week that is entirely blank carries `aria-hidden`.
- Biome's `noSecrets` flags repeated-key strings such as `"{ArrowLeft}{ArrowLeft}"` in
  `Calendar.browser.test.tsx`. The test uses a small `press(key, times)` helper rather than suppressing the
  rule; Shift is held across calls with `{Shift>}` ... `{/Shift}`.
- A selected day that is also `aria-disabled` takes the full accent fill unless a rule with a higher
  specificity says otherwise: `[aria-selected="true"]` and `[aria-disabled="true"]` tie, and the later one
  wins. `Calendar.stylesheet.ts` has a `[aria-selected="true"][aria-disabled="true"]` rule for the accent
  wash. A forced hover in a browser test does not discriminate the `:not([aria-disabled])` scoping on the
  selected hover rule, because the new rule wins that tie anyway.
- Whether February needs 4 rows depends on the locale's first day: February 2027 is 4 weeks in a
  Monday-first locale and 5 in a Sunday-first one (en-US). Geometry tests that want a 4-week month pick
  February 2026 under en-US.
