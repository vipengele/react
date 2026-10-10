# @vipengele/react-charts-storybook

Vite-based Storybook app demonstrating `@vipengele/react-charts`. Private (`"private": true`),
not published. See the project's root commands in `source/react-charts/package.json`.

## Commands

```bash
pnpm --filter @vipengele/react-charts-storybook dev         # storybook dev -p 6006
pnpm --filter @vipengele/react-charts-storybook build       # storybook build -> storybook-static/
pnpm --filter @vipengele/react-charts-storybook type-check
```

## Notes

- `.storybook/main.ts` picks up stories from `src/**/*.stories.@(ts|tsx)` via
  `@storybook/react-vite`.
- `.storybook/preview.tsx` wraps every story in `ThemeProvider` from `@vipengele/react-tokens`,
  with a toolbar toggle for the colour mode.
- `.storybook/manager.ts` sets the sidebar title and an accent colour matching
  `@vipengele/react-tokens`' default seed accent.
- `storybook-static/` is the build output `pnpm build:pages` copies into `pages-dist/`.
- Depends on `@vipengele/react-charts` as `workspace:*` — turbo builds it before this app because
  of `build`'s `dependsOn: ["^build"]` in `turbo.json`. `@vipengele/react-tokens` is a published
  range, as for any cross-project dependency.
- Stories import only from `@vipengele/react-charts`; Recharts is not a dependency of this app.
