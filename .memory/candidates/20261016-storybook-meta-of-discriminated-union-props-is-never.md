---
about: a component whose props are a discriminated union cannot use the satisfies Meta<typeof C> pattern in stories
saw:
  - source/react-ui/apps/storybook/src/StatTile.stories.tsx
  - source/react-ui/packages/ui/src/StatTile/StatTile.tsx
  - source/react-ui/apps/storybook/src/Badge.stories.tsx
---
Badge.stories.tsx uses `satisfies Meta<typeof Badge>` with `StoryObj<typeof meta>`. For StatTile,
whose `StatTileProps` is `StatTileNeutralProps | StatTileStatusProps` (a status tone requires
`toneLabel`, neutral forbids it), that pattern types story `args` as `never` and fails type-check.
StatTile.stories.tsx annotates `meta: Meta<StatTileNeutralProps>` and uses
`StoryObj<StatTileNeutralProps>`, so stories set `tone` and `toneLabel` explicitly in JSX. Pairing
`satisfies` with `decorators` there also raised TS2883 (inferred type cannot be named), which the
explicit annotation avoids. Expect the same for any future union-props component.
