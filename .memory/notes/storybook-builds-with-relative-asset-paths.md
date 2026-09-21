---
name: storybook-builds-with-relative-asset-paths
kind: rationale
description: The Storybook build emits relative asset paths, so it works at any Pages subpath with no Vite base; the brand logo reference is relative for the same reason.
anchors:
  - path: source/react-ui/apps/storybook/.storybook/main.ts
    blob: 5e8d0b88d3e0
  - path: source/react-ui/apps/storybook/.storybook/manager.ts
    blob: 844f455207fb
  - path: source/react-ui/package.json
    blob: 7325023efcae
  - path: .github/workflows/pages-deploy.yml
    blob: 3608bc52c78b
confidence: verified
---

`source/react-ui/apps/storybook/.storybook/main.ts` sets no Vite `base` (the whole config is
`main.ts:3-18`), and none is needed. Every asset reference in the built
`storybook-static/index.html` and `iframe.html` is relative (`./sb-manager/runtime.js`,
`./assets/iframe-*.js`, `./favicon.svg` — checked against a local build), so one build serves
correctly from `/`, `/react/` or `/react/react-ui/`.

That is what lets the Pages site mount each project in its own subdirectory:
`pages-deploy.yml:253-254` copies a project's `pages-dist` into `_site/<name>/` without the
project knowing where it will live. `build:pages` (`source/react-ui/package.json:12`) therefore
just runs `pnpm build` and copies `apps/storybook/storybook-static` to `pages-dist` — there is no
URL to thread through it.

The one hand-written asset URL follows the same rule: `manager.ts:15` sets
`brandImage: "./brand/vipengele-logo-horizontal.svg"`, relative, against the `/brand` mount that
`main.ts:13`'s `staticDirs` creates. An absolute `/brand/...` would resolve against the Pages
host root and break under a subpath.

Adding a `base` to the Storybook Vite config would couple the build to one mount path and break
the others; its absence is deliberate.
