# @tandiko/storybook

Vite-based Storybook app demonstrating `@tandiko/tokens` and `@tandiko/icons`. Private
(`"private": true`), not published. See the root `AGENTS.md` for monorepo-wide commands and
policy.

## Commands

```bash
pnpm --filter @tandiko/storybook dev         # storybook dev -p 6006
pnpm --filter @tandiko/storybook build       # storybook build -> storybook-static/
pnpm --filter @tandiko/storybook type-check
```

## Notes

- `.storybook/main.ts` picks up stories from `src/**/*.stories.@(ts|tsx)` via
  `@storybook/react-vite`, and serves `@tandiko/brand`'s `assets/dist` at the manager root
  (`staticDirs`) so `.storybook/manager.ts` can reference the Tandiko logo.
- `.storybook/manager.ts` replaces Storybook's own branding in the sidebar header (logo, title,
  accent colour matching `@tandiko/tokens`' default seed accent) — the same customization
  `wardnet-design-system` applies via its own `manager.ts`.
- `storybook-static/` is the build output consumed by `.github/workflows/pages-deploy.yml`,
  which copies it into `_site` and publishes to GitHub Pages on push to `main` only.
- Depends on `@tandiko/tokens` and `@tandiko/icons` as `workspace:*` — turbo builds those
  packages before this app because of `build`'s `dependsOn: ["^build"]` in `turbo.json`.
