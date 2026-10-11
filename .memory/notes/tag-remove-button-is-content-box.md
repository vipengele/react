---
name: tag-remove-button-is-content-box
kind: rationale
description: Tag's remove button is content-box so width/height size the glyph and the space-1 padding adds the click target, matching Badge's icon steps inside the fixed badge height.
anchors:
  - path: source/react-ui/packages/ui/src/Tag/Tag.stylesheet.ts
    blob: 263fa74cff1e
  - path: source/react-ui/packages/ui/src/Badge/Badge.stylesheet.ts
    blob: 2e519b87b734
confidence: verified
---

`Tag.stylesheet.ts:28-31` sets `box-sizing: content-box` with `padding: var(--vpg-space-1)`; with `border-box` the padding would
be carved out of the stated size and the glyph would render smaller than Badge's icon step
(`Badge.stylesheet.ts:56-62` uses `--vpg-icon-sm`/`--vpg-icon-md`). A pixel padding is rejected by the spacing-scale
rule in `CONTEXT.md`. `.vpg-badge.vpg-tag` carries two classes so its `padding-inline-end` (`Tag.stylesheet.ts:20`) beats
Badge's single-class `padding-inline` whatever order the injected stylesheets land in.
