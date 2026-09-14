# @tandiko/icons

A curated, tree-shakable re-export of `lucide-react` icons, plus the `Icon` wrapper that sizes
them from `--tandiko-icon-*` custom properties.

```tsx
import { Icon, ChevronDown } from "@tandiko/icons";

<Icon icon={ChevronDown} />;
```

## Tree-shaking

Icons are individually named exports — never a namespace barrel — so a consumer importing one
glyph pulls in only that glyph, not the rest of the curated set or the full `lucide-react`
package. Pass the icon component itself to `Icon`, not a name: a name-to-component lookup would
have to reference the whole curated set, which defeats tree-shaking.

## Sizing

`Icon` without a `size`/`strokeWidth` prop renders at `var(--tandiko-icon-size-md)` /
`var(--tandiko-icon-stroke-md)`, with a fallback value baked into this package's own stylesheet
for standalone use before `@tandiko/tokens` defines those custom properties. An explicit `size`
or `strokeWidth` prop is forwarded straight to the glyph instead, which sets it as an SVG
attribute — CSS custom properties can't set SVG size/stroke-width attributes directly.

## Peer dependencies

React 19 and React DOM 19 — `Icon` is a React component.
