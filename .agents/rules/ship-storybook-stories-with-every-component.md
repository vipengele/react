# Ship a component's Storybook stories in the same PR that adds or changes it

Storybook is the design system's living demo and review surface. A component merged without
its stories is undemonstrated and untested from a consumer's point of view, and a story left
behind after its component changes documents behaviour that no longer exists.

## Applies to

- Any PR that adds, removes, or materially changes a component exported from `packages/tokens`
  or `packages/icons` (or any future `packages/*` component package).
- Stories live in `apps/storybook/src/*.stories.@(ts|tsx)`.

## Example

Adding a new `Icon` variant to `@tandiko/icons` in a PR must update or add the corresponding
story in `apps/storybook/src/Icons.stories.tsx` in that same PR — not as a follow-up.
