---
about: CSS Modules do not work in this repo's tsup/esbuild-based package builds
saw: packages/tokens/src/base-stylesheet.ts, packages/icons/src/icon-stylesheet.ts
---

esbuild (tsup's bundler) has no built-in CSS Modules scoping. A package here that imported a
`.module.css` file and referenced `styles.someClass` built successfully under Vitest (which
runs on Vite, which does support CSS Modules — masking the problem in tests) but produced an
empty placeholder object (`var Icon_default = {}`) in the actual `tsup`-built `dist/index.js`,
silently breaking every class reference at runtime while looking correct in every local check
except reading the built output by hand.

The established pattern in this monorepo instead: export the CSS as a plain template-string
constant from a `.ts` file (e.g. `base-stylesheet.ts`, `icon-stylesheet.ts`) and inject it via
React 19's `<style href="<unique-id>" precedence="<unique-id>">{cssString}</style>`, which
React de-duplicates by `href` so N component instances emit one `<style>` tag. This also keeps
the package `"sideEffects": false` with no exception needed, since nothing is imported for its
side effect — the string is just a value.

Any future package here that wants default/fallback styling should follow this pattern
(`packages/tokens/src/ThemeProvider.tsx` and `packages/icons/src/Icon.tsx` for the two
call-sites), not reach for CSS Modules — it will look correct under `vitest` and be silently
broken in the published build.
