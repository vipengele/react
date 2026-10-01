---
about: source/react-ui/packages/ui/src/Badge/Badge.stylesheet.ts
saw: reviewing the Badge README example, which passed `size={12}` to an icon inside the slot
---

`Badge`'s `icon` slot sizes whatever node it is given. `.vpg-badge-icon > *` in
`source/react-ui/packages/ui/src/Badge/Badge.stylesheet.ts` sets `width: 100%; height: 100%`, and
`.vpg-badge-sm .vpg-badge-icon` / `.vpg-badge-md .vpg-badge-icon` size the wrapper from the
`--vpg-icon-sm` / `--vpg-icon-md` steps. A stylesheet rule beats the `width`/`height` attributes an
SVG glyph renders, so a `size` prop on an `Icon` placed in the slot has no effect: the badge's own
size step wins.

The wrapper in `source/react-ui/packages/ui/src/Badge/Badge.tsx` is `aria-hidden`, and the icon takes
its colour from `currentColor` rather than from any `--vpg-*` property assigned inline, which is why
the slot never sets a colour.
