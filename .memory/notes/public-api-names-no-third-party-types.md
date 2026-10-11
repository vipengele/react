---
name: public-api-names-no-third-party-types
kind: invariant
description: The ui package's public prop types never name floating-ui or tanstack types; placements are re-declared literal unions, and nothing mechanical enforces it.
anchors:
  - path: source/react-ui/packages/ui/src/Popover/Popover.tsx
    blob: 9b43d6d0a650
  - path: source/react-ui/packages/ui/src/Tooltip/Tooltip.tsx
    blob: 9fd74110850f
  - path: source/react-ui/packages/ui/src/ContextMenu/useContextMenuTriggers.ts
    blob: 667954cd817c
  - path: source/react-ui/packages/ui/tsup.config.ts
    blob: 0fffcffb7eb7
confidence: verified
---

`PopoverPlacement` and `TooltipPlacement` are hand-written `"top" | "bottom" | "left" | "right"` unions
(`Popover.tsx:21`, `Tooltip.tsx:7`), so consumers need no floating-ui types. `VirtualElement` is a
type import only in an internal hook (`useContextMenuTriggers.ts:1`), and `Tree.tsx:1` imports
react-virtual for internal use. Declarations come from `tsc -p tsconfig.build.json` (`tsup.config.ts:9`
sets `dts: false`); tsup externalises only react and react-dom (`:13`), so both libraries are real
dependencies. Unlike charts ([[charts-api-check-scans-only-reachable-declarations]]), the ui package has
no api-check, so a leaked third-party type in a public signature would pass every gate.
