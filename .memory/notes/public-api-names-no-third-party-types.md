---
name: public-api-names-no-third-party-types
kind: invariant
description: The ui package's public prop types never name floating-ui or tanstack types; placements are re-declared literal unions, and nothing mechanical enforces it.
anchors:
  - path: source/react-ui/packages/ui/src/Popover/Popover.tsx
    blob: e15783dc3f25
  - path: source/react-ui/packages/ui/src/Tooltip/Tooltip.tsx
    blob: 9fd74110850f
  - path: source/react-ui/packages/ui/src/ContextMenu/useContextMenuTriggers.ts
    blob: 667954cd817c
  - path: source/react-ui/packages/ui/tsup.config.ts
    blob: 0fffcffb7eb7
confidence: verified
---

`PopoverPlacement` and `TooltipPlacement` are hand-written string-literal unions
(`Popover.tsx:30`, which also admits `top-start`/`bottom-start`; `Tooltip.tsx:7`), so consumers need no floating-ui types. `VirtualElement` is a
type import only in an internal hook (`ContextMenu/useContextMenuTriggers.ts`), and `Tree.tsx:1` imports
react-virtual for internal use. Declarations come from `tsc -p tsconfig.build.json` (`tsup.config.ts:9`
sets `dts: false`); tsup externalises only react and react-dom (`:15`), so both libraries are real
dependencies. Unlike charts ([[charts-api-check-scans-only-reachable-declarations]]), the ui package has
no api-check, so a leaked third-party type in a public signature would pass every gate.
