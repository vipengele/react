---
about: public prop types never name floating-ui or tanstack types; placements are re-declared literal unions
saw:
  - source/react-ui/packages/ui/src/Popover/Popover.tsx
  - source/react-ui/packages/ui/src/Tooltip/Tooltip.tsx
  - source/react-ui/packages/ui/src/ContextMenu/useContextMenuTriggers.ts
  - source/react-ui/packages/ui/src/Tree/Tree.tsx
  - source/react-ui/packages/ui/tsup.config.ts
  - source/react-ui/packages/ui/package.json
---
`grep -rn 'from "@floating-ui\|from "@tanstack' src` (non-test): floating-ui is imported only in implementation files
(Popover, Menu, Dropdown, Tooltip, ContextMenu, internal/*); `VirtualElement` is a type import in an internal hook
(useContextMenuTriggers.ts:1). `PopoverPlacement`/`TooltipPlacement` are hand-written `"top"|"bottom"|"left"|"right"`
unions (Popover.tsx:21, Tooltip.tsx:7), so consumers need no floating-ui types. Tree.tsx:1 imports react-virtual only
internally. Declarations come from `tsc -p tsconfig.build.json` (tsup dts:false), tsup externalises only react/react-dom;
package.json has `"sideEffects": false`, deps `@floating-ui/react`, `@tanstack/react-virtual` as real dependencies.
No api-check exists in packages/ui (the charts package has one: charts-api-check note), so nothing enforces this mechanically.
