---
name: rangecalendar-hover-preview-test-hazard
kind: gotcha
description: RangeCalendar draws its pending span from whichever of the hovered and focused day moved last, so a hover cursor left over from an earlier browser test overrides a preview set by focus; keyboard tests go before any hover.
anchors:
  - path: source/react-ui/packages/ui/src/RangeCalendar/RangeCalendar.tsx
    blob: 51a083a0786f
  - path: source/react-ui/packages/ui/src/RangeCalendar/RangeCalendar.browser.test.tsx
    blob: 05d80644df06
confidence: suspect
---

`RangeCalendar` draws its pending span (`data-preview`) from whichever of the hovered and the focused day moved last
(`hoveredRef`/`focusedRef` in `RangeCalendar.tsx`). In Chromium a cursor left over from an earlier test's `userEvent.hover` fires
pointer events when the calendar re-renders under it, making the hovered day the latest source and overriding a preview a test set
by focus. Keyboard tests therefore sit before any hover in `RangeCalendar.browser.test.tsx`. A day's background carries Calendar's
colour transition, so an assertion on a background that changes after mount needs `expect.poll`.
