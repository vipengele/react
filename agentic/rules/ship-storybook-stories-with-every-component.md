---
description: A component and its Storybook stories ship in the same PR.
---

# Ship a component's Storybook stories in the same PR that adds or changes it

Storybook is the design system's living demo and review surface. A component merged without
its stories is undemonstrated and untested from a consumer's point of view, and a story left
behind after its component changes documents behaviour that no longer exists.

## Applies to

- Any PR that adds, removes, or materially changes a component exported from `source/react-ui/packages/tokens`
  or `source/react-ui/packages/icons` (or any future `packages/*` component package).
- Stories live in `source/react-ui/apps/storybook/src/*.stories.@(ts|tsx)`.

## Example

Adding a new `Icon` variant to `@vipengele/react-icons` in a PR must update or add the corresponding
story in `source/react-ui/apps/storybook/src/Icons.stories.tsx` in that same PR — not as a follow-up.
