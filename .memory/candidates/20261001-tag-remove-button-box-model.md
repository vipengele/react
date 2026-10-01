---
about: source/react-ui/packages/ui/src/Tag/Tag.stylesheet.ts
saw: a panel review flagging a literal `padding: 2px` on the remove button, whose fix changed the button's box model
---

`Tag`'s remove button is `box-sizing: content-box`, so its `width`/`height` size the glyph and the
`--vpg-space-1` padding adds the click target around it. `.vpg-badge-sm .vpg-tag-remove` uses the
`--vpg-icon-sm` step and `.vpg-badge-md .vpg-tag-remove` the `--vpg-icon-md` step, which are the same
steps `Badge` gives its own icon slot in `source/react-ui/packages/ui/src/Badge/Badge.stylesheet.ts`.
The resulting button (22px small, 24px medium) fits inside the badge's fixed `--vpg-size-xs` /
`--vpg-size-sm` height.

With `border-box` the padding would be carved out of the stated size and the glyph would render
smaller than the badge's icon step. A pixel literal for the padding is rejected by the Spacing
scale rule in `CONTEXT.md`: every gap, padding and inset takes a `--vpg-space-*` step.

`.vpg-badge.vpg-tag` in the same stylesheet carries two classes so its trailing `padding-inline-end`
overrides `Badge`'s single-class `padding-inline` whatever order the two injected stylesheets land in.
