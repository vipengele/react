---
about: nothing depends on @vipengele/brand as a package — Storybook reaches its assets through a relative staticDirs path — which is what lets it be private
saw:
  - source/react-ui/apps/storybook/.storybook/main.ts
  - source/react-ui/apps/storybook/package.json
  - source/react-ui/packages/brand/package.json
---
`@vipengele/brand` is in no workspace's `dependencies`. `source/react-ui/apps/storybook/package.json` depends only on `@vipengele/react-tokens`, `@vipengele/react-icons` and `@vipengele/react-ui`; the brand assets arrive through `main.ts`'s `staticDirs: ["../../../packages/brand/assets/dist"]`, a relative filesystem path rather than a package import, and `manager.ts` then references the logo by filename at the manager root.

That is why `packages/brand/package.json` can carry `"private": true` without breaking any build: a private package is still a workspace member and its files are still on disk, and nothing resolves it through `exports`. The release workflow selects packages with `select(.private == false)`, so a private brand is simply not published.

The consequence to know before changing it: a consumer of the published `@vipengele/brand` would import `@vipengele/brand/svg/*` (the `exports` map), while Storybook does not — so the `exports` map is untested by anything in this repo.
