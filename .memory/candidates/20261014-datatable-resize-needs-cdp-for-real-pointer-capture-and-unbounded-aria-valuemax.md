---
about: DataTable's column-resize handle is only testable with real pointer capture through the browser project's CDP, and its separator needs an explicit aria-valuemax because an omitted one reads as 100
saw:
  - source/react-ui/packages/ui/src/DataTable/DataTableResizeHandle.tsx
  - source/react-ui/packages/ui/src/DataTable/DataTable.browser.test.tsx
  - source/react-ui/packages/ui/src/DataTable/useColumnSizing.ts
---
- `DataTableResizeHandle.tsx` drives a drag with `setPointerCapture` on the handle element, so the drag survives the
  pointer leaving it. `DataTable.browser.test.tsx` imports `cdp` from `vitest/browser` and sends
  `Input.dispatchMouseEvent`, because the synthetic events `userEvent` dispatches do not exercise real capture. A jsdom
  test cannot observe capture at all.
- The separator's `aria-valuemax` is `UNBOUNDED_VALUE_MAX` (`Number.MAX_SAFE_INTEGER`) for a column with no `maxSize`,
  because an omitted `aria-valuemax` on a separator is read as `100` and would clamp the value assistive technology
  announces for any column wider than 100px. The accessibility-tree checks in the same browser file read the tree through
  CDP (`Accessibility.getFullAXTree`) rather than inferring it from attributes.
- `useColumnSizing.ts` holds the sizes: controllable `columnSizes` by column id, clamped into each column's
  `minSize`/`maxSize` at render and never reported when clamped; a column with an entry is drawn at exactly that width,
  so a drag moves its edge 1:1 with the pointer and only columns without an entry share a measured surplus.
