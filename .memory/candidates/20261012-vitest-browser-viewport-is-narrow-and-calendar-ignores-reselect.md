---
about: two traps for components that host a Calendar or read useMediaQuery - the default Vitest browser viewport is below the narrow breakpoint, and Calendar ignores a pick of the already-selected day
saw:
  - source/react-ui/packages/ui/src/internal/useMediaQuery.ts
  - source/react-ui/packages/ui/src/DateField/DateField.browser.test.tsx
  - source/react-ui/packages/ui/src/Calendar/Calendar.tsx
  - source/react-ui/packages/ui/src/vitest.setup.ts
---
- `NARROW_VIEWPORT_QUERY` (`useMediaQuery.ts:8`) matches below 40rem. The Vitest browser project's default iframe is 414x896, so any browser
  test of a component reading `useMediaQuery` runs the narrow layout unless it calls `page.viewport` first; DateField's pop-up suite pins a wide
  viewport in `beforeEach` (`DateField.browser.test.tsx:202`) and its narrow suite pins a narrow one (`:346`). In jsdom the `matchMedia` stub in
  `vitest.setup.ts` never matches, so jsdom tests are always the wide layout unless a test replaces `window.matchMedia`.
- `Calendar` returns early when the picked day equals the selected one (`Calendar.tsx:65`, `selected?.equals(date)`), so it never calls its
  change callback for a re-pick. A host that closes on pick (DateField) therefore stays open when the user picks the day that is already the
  value; only Escape or an outside press closes it.
