about: source/react-ui/packages/ui/src/FileInput/FileInput.stylesheet.ts
saw: building FileInput's focus ring around a visually hidden native file input
---

The native `<input type="file">` is clipped to 1px, so an outline on it is invisible. The zone
draws the ring instead, through `.vpg-file-input:has(> input:focus-visible)` in
`source/react-ui/packages/ui/src/FileInput/FileInput.stylesheet.ts`. The `>` makes the selector
depend on the input being a **direct child** of the zone root in
`source/react-ui/packages/ui/src/FileInput/FileInput.tsx`; wrapping the input in another element
silently removes the ring and no jsdom test notices, because jsdom does not evaluate focus-visible
against real focus. `source/react-ui/packages/ui/src/FileInput/FileInput.browser.test.tsx` is the
only test that fails when the structure changes.

The same direct-child scoping drives the disabled styling (`:has(> input:disabled)`), so rows and
the status region must stay outside any `> input` match.
