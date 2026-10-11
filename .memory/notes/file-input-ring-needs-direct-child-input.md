---
name: file-input-ring-needs-direct-child-input
kind: gotcha
description: FileInput's focus ring and disabled styling use :has(> input), so wrapping the clipped native input silently removes them and only the browser test notices.
anchors:
  - path: source/react-ui/packages/ui/src/FileInput/FileInput.stylesheet.ts
    blob: 341e9104cd7d
  - path: source/react-ui/packages/ui/src/FileInput/FileInput.tsx
    blob: fe0ac66510ae
  - path: source/react-ui/packages/ui/src/FileInput/FileInput.browser.test.tsx
    blob: 76b541c0d749
confidence: verified
---

The native file input is clipped to 1px, so the zone draws the ring: `.vpg-file-input:has(> input:focus-visible)`
(`FileInput.stylesheet.ts:51`), and disabled styling uses `:has(> input:disabled)` (`:61`). The `>`
requires the input to be a direct child of the zone root. Wrapping it removes the ring with no
error, and jsdom does not evaluate `:focus-visible` against real focus, so only
`FileInput.browser.test.tsx` fails. Rows and the status region must stay outside any `> input` match.
Same family: [[field-shell-control-must-be-direct-child]].
