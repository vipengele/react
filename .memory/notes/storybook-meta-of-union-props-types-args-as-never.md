---
name: storybook-meta-of-union-props-types-args-as-never
kind: gotcha
description: "A component whose props are a discriminated union cannot use the satisfies Meta<typeof C> story pattern: args type as never; annotate Meta with one arm instead."
anchors:
  - path: source/react-ui/apps/storybook/src/StatTile.stories.tsx
    blob: 45b6c9a0f039
  - path: source/react-ui/packages/ui/src/StatTile/StatTile.tsx
    blob: e470965a1d89
  - path: source/react-ui/apps/storybook/src/Badge.stories.tsx
    blob: c8933043bcb9
confidence: verified
---

`Badge.stories.tsx:9` uses `satisfies Meta<typeof Badge>` with `StoryObj<typeof meta>`. For StatTile, whose `StatTileProps` is
`StatTileNeutralProps | StatTileStatusProps` (a status tone requires `toneLabel`, neutral forbids it), that pattern types story
`args` as `never` and fails type-check. `StatTile.stories.tsx:10` annotates `const meta: Meta<StatTileNeutralProps>` and uses
`StoryObj<StatTileNeutralProps>`, so stories set `tone` and `toneLabel` explicitly in JSX. Pairing `satisfies` with `decorators`
there also raised TS2883 (inferred type cannot be named), which the explicit annotation avoids. Expect the same for any future
union-props component.
