---
about: no component in packages/ui ever sets a --vpg-* custom property inline on its own instance, and the tested rationale (ADR-0007's dark-mode reassignment) is narrower than the invariant actually enforced
saw:
  - source/react-ui/packages/ui/src/Tooltip/Tooltip.test.tsx
  - source/react-ui/packages/ui/src/Dropdown/Dropdown.test.tsx
  - source/react-ui/packages/ui/src/Spinner/Spinner.test.tsx
  - source/react-ui/packages/ui/src/Popover/Popover.test.tsx
  - source/react-ui/packages/ui/src/Textarea/Textarea.test.tsx
  - source/react-ui/packages/ui/src/StatePanel/StatePanel.test.tsx
  - source/react-ui/packages/ui/src/Skeleton/Skeleton.tsx
  - source/react-ui/packages/ui/src/Skeleton/Skeleton.test.tsx
  - docs/adr/0007-base-stylesheet-owns-every-mode-resolved-property.md
  - docs/adr/0009-components-read-role-tokens-with-no-literal-fallback.md
---

Investigated for ADR (vipengele/react#31: layout primitives setting `--vpg-stack-gap` etc.
inline, consumed by a static stylesheet).

Seven components each carry their own dedicated test titled "never/assigns no --vpg-*
[custom] property inline", checked with `grep -rn 'toContain("--vpg-")'
source/react-ui/packages/ui/src`: `Tooltip.test.tsx:249`, `Dropdown.test.tsx:910-911`,
`Spinner.test.tsx:52`, `Popover.test.tsx:314`, `Textarea.test.tsx:111`,
`StatePanel.test.tsx:131` (loops every `[style]` element, not just the root). This is a
repeated, deliberate convention, not one component's edge case.

The comment repeated in Tooltip/Spinner/Popover gives the narrow rationale: "An inline
custom property would beat the base stylesheet's dark-mode reassignment on the same
element, so this instance would stop adapting to colour mode" — this is ADR-0007's
mechanism (`docs/adr/0007-...md`: an inline declaration on `.vpg-root`/its descendants
beats a non-`!important` stylesheet rule for the same property on the same element).

But the invariant as tested is broader than that rationale: `Textarea.test.tsx:111` and
`StatePanel.test.tsx:131` assert the same thing for components with no colour-mode-sensitive
custom property at all. And when a component genuinely needs a caller-controlled,
per-instance geometric value, the established pattern is a **plain CSS property**, never a
`--vpg-*` custom property:

- `Skeleton.tsx` (`width`/`height` props) sets inline `width`/`height` (plain CSS), with an
  explicit comment: "Neither is a `--vpg-*` custom property, so both are safe to set as an
  inline style — they're the per-instance dimensions the caller controls, not a
  theme-controlled colour."
- `Textarea.test.tsx:95-105` shows `autoGrow` setting inline `min-height`/`max-height`
  (`Nlh`/`Mlh`), again plain CSS, not a custom property.

So there is no existing precedent anywhere in `packages/ui` for a component setting a
component-private `--vpg-*` custom property inline (nothing like `--vpg-skeleton-width`
exists). `--vpg-stack-gap` set inline by a layout primitive would be the first instance of
this mechanism in the codebase and would directly contradict seven existing, passing tests'
stated invariant ("never assigns a --vpg-* property inline") even though those tests'
literal rationale (dark-mode reassignment) doesn't obviously apply to a non-colour value
like a gap. The ADR needs to either state an explicit, narrower version of the invariant
("no *theme-resolvable* `--vpg-*` name is set inline" vs. "no `--vpg-*` name at all is set
inline") and carve out layout primitives, or use the plain-CSS-property convention Skeleton/
Textarea already establish instead of custom properties for per-instance values.

Separately, ADR-0009 (`docs/adr/0009-...md:21-24`) states: "a `--vpg-*` name the theme never
assigns advertises a theming hook the system does not support." `--vpg-stack-gap` would be a
name `createTheme` never assigns (it is assigned per-instance by the Stack component itself,
not by the theme) — this is a different production site than the fifty-four role-token names
ADR-0009 covers (those are read via `var()` with a literal fallback and are theme-assigned in
`createTheme`), so ADR-0009's invariant as literally stated doesn't obviously forbid it, but
the "advertises a theming hook" reasoning is exactly the kind of ambiguity the new ADR should
address head-on, since a consumer could plausibly try to override `--vpg-stack-gap` via CSS
expecting it to be theme-wide.
