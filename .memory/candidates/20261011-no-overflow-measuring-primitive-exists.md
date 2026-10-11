---
about: no shared overflow-to-menu primitive exists; the only ResizeObserver collapse is private to Dropdown's chip row
saw:
  - source/react-ui/packages/ui/src/Dropdown/Dropdown.tsx
  - source/react-ui/packages/ui/src/vitest.setup.ts
  - source/react-ui/packages/ui/src/Toolbar/Toolbar.tsx
  - source/react-ui/packages/ui/src/Breadcrumbs/Breadcrumbs.tsx
  - docs/adr/0045-sidenav-owns-its-responsive-switch.md
---
`grep -rlE "ResizeObserver|IntersectionObserver" packages/ui/src` -> vitest.setup.ts, Dropdown.tsx, Dropdown.browser.test.tsx only.
Toolbar uses MutationObserver (ADR 0044) and no measuring; Breadcrumbs "collapse" is count-based (maxItems/itemsBefore/After),
not width-based. SideNav uses the repo's first matchMedia hook (ADR 0045), not element measuring.

Only measuring precedent: Dropdown chip row, `Dropdown.tsx:595-615` (hook ending at ~:617): measure() in an effect,
ResizeObserver on `row.parentElement` (not the row: the row's width answers its own collapse -> feedback loop), callback
wraps measure in flushSync so the recollapsed row paints in the same frame as the resize (a later-task React update
lands after paint = flicker). It is a private hook in Dropdown.tsx, not in src/internal/. Extracting it would be new work.

jsdom: vitest.setup.ts:10-14 stubs ResizeObserver as a no-op class (callback never fires), so measuring code is only
provable in `*.browser.test.tsx` (chromium project, vitest.config.ts). Coverage thresholds are 100% on all four metrics
for `src/**/*.{ts,tsx}` and v8 coverage is configured at top-level of vitest.config.ts test.coverage, so both projects
(jsdom + chromium) feed one report (not independently verified by running a coverage report).
SSR/first paint: ADR 0045 accepts "renders docked until matchMedia resolves, corrects after mount"; no hysteresis
precedent found anywhere.
