---
about: the Storybook build emits relative asset paths, so the site works at any Pages subpath with no Vite base config
saw:
  - source/react-ui/apps/storybook/.storybook/main.ts
  - source/react-ui/package.json
  - .github/workflows/pages-deploy.yml
---
`source/react-ui/apps/storybook/.storybook/main.ts` sets no Vite `base`, and none is needed. Every asset reference in the built `storybook-static/index.html` and `iframe.html` is relative (`./sb-manager/runtime.js`, `./assets/iframe-*.js`, `./favicon.svg`), so the same build serves correctly from `/`, from `/react/`, or from `/react/react-ui/`.

This is what lets the Pages site give each project its own subdirectory (`pages-deploy.yml` copies a project's `pages-dist` to `_site/<project>/`) without the project knowing where it will be mounted. `source/react-ui/package.json`'s `build:pages` therefore just runs `pnpm build` and copies `apps/storybook/storybook-static` to `pages-dist` — there is no URL to thread through it.

Adding a `base` to the Storybook Vite config would couple the build to one mount path and break the others, so the absence of one is deliberate rather than an oversight.
