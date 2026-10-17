---
name: datatable-resize-handle-needs-cdp-and-explicit-aria-valuemax
kind: gotcha
description: DataTable's column-resize handle is testable only with real pointer capture through the browser project's CDP, and its separator needs an explicit aria-valuemax because an omitted one reads as 100.
anchors:
  - path: source/react-ui/packages/ui/src/DataTable/DataTableResizeHandle.tsx
    blob: ad75f28aea39
  - path: source/react-ui/packages/ui/src/DataTable/DataTable.browser.test.tsx
    blob: 21f33e085ef2
  - path: source/react-ui/packages/ui/src/DataTable/useColumnSizing.ts
    blob: 9541b501ae20
confidence: suspect
---

- `DataTableResizeHandle.tsx` drives a drag with `setPointerCapture` on the handle, so the drag survives the pointer leaving it.
  `DataTable.browser.test.tsx` imports `cdp` from `vitest/browser` and sends `Input.dispatchMouseEvent`, because the synthetic
  events `userEvent` dispatches do not exercise real capture. A jsdom test cannot observe capture at all.
- The separator's `aria-valuemax` is `UNBOUNDED_VALUE_MAX` (`Number.MAX_SAFE_INTEGER`) for a column with no `maxSize`, because an
  omitted `aria-valuemax` on a separator is read as `100` and would clamp the value announced for any column wider than 100px. The
  accessibility-tree checks in the same browser file read the tree through CDP (`Accessibility.getFullAXTree`).
- `useColumnSizing.ts` keeps controllable `columnSizes` by column id, clamped into each column's `minSize`/`maxSize` at render and
  never reported when clamped. A column with an entry is drawn at exactly that width, so a drag moves its edge 1:1 with the pointer
  and only columns without an entry share a measured surplus.
