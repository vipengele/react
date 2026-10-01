---
about: bundle-check has no byte budget; a new date library's "bundle cost" is not measured or gated by anything today, only absence-of-marker leak checks against a Button-only bundle
saw:
  - source/react-ui/packages/ui/bundle-check/run.mjs
  - source/react-ui/packages/ui/bundle-check/entry.js
  - source/react-ui/packages/ui/package.json
---
`bundle-check/run.mjs` builds `entry.js` (exports only Button from `../dist/index.js`, `entry.js:4`)
with vite, `minify: false` (`run.mjs:25`), and asserts marker strings: Button/Spinner present
(`:50`, `:54`), every other component's stylesheet marker absent (list from `:60`), floating-ui
markers absent (`floatingUiMarkers`, `:112`), `@vipengele/react-telemetry` absent. The only size
output is an informational `code.length` in the final log line. `grep -rn "size-limit|bundlesize|gzip"`
over the package.json files found nothing. So a date library has no budget to fit under: adopting one
means inventing a threshold and, as with floating-ui, a runtime-emitted marker string for it (an
export name is not a usable marker, see note bundle-check-floating-ui-markers-lack-positive-control).
Dependencies of ui today: `@floating-ui/react`, `@vipengele/react-icons`, `@vipengele/ts ^0.0.2`
(`ui/package.json:35-39`); peers react/react-dom ^19. tsconfig target ES2022 (`tsconfig.base.json:7`);
no browserslist anywhere in source/react-ui. node_modules was not installed, so whether `@vipengele/ts`
carries any date/Temporal support was not checked.
