---
name: badge-icon-slot-owns-glyph-size
kind: gotcha
description: Badge's icon slot forces its child to the badge's icon step, so a size prop on an Icon placed in the slot has no effect.
anchors:
  - path: source/react-ui/packages/ui/src/Badge/Badge.stylesheet.ts
    blob: 2e519b87b734
  - path: source/react-ui/packages/ui/src/Badge/Badge.tsx
    blob: "228930664096"
confidence: verified
---

`Badge.stylesheet.ts:56-62` sizes the slot wrapper from `--vpg-icon-sm`/`--vpg-icon-md`, and the `.vpg-badge-icon > *`
rule gives its child `width: 100%; height: 100%`. A stylesheet rule beats the `width`/`height` attributes an SVG glyph
renders, so `size={12}` on an `Icon` in the slot is ignored. The wrapper is `aria-hidden` and the glyph takes
`currentColor`, so the slot sets no colour.
