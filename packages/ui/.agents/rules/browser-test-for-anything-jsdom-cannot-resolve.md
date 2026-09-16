# A jsdom test never proves geometry, custom properties or motion — write a browser test for those

jsdom performs no layout and resolves no CSS: `getComputedStyle` returns whatever string was
authored, not what the cascade, `calc()`, `light-dark()` or a custom property resolve to. A test
run under jsdom can only ever assert the DOM shape it built — never the pixel, colour or timing a
consumer's browser actually renders. A component can pass every jsdom assertion while its theme
never reaches the browser, or while a control's height is silently wrong.

## What belongs in a jsdom test

- Behaviour: state transitions, prop handling, callback firing, keyboard/pointer event wiring.
- Accessibility wiring: the right role, `aria-*` attributes and their values, focus-management
  calls (`focus()`, `blur()`) firing on the right element.
- Anything the DOM shape alone proves — rendering the right elements, attributes and children for
  a given prop combination.

## What belongs in a browser test

- Computed geometry: element size, position, or anything read off `getBoundingClientRect` or
  `getComputedStyle` that depends on real layout.
- Custom property resolution: any assertion that a `--tandiko-*` property, `var()`, `calc()` or
  `light-dark()` expression resolves to a particular value in a particular colour scheme.
- Motion: transition or animation timing and the states they interpolate between.
- Measured design targets (control heights, text sizes, spacing) — jsdom cannot resolve any of
  the CSS that produces them, so a target expressed as a jsdom assertion is unverifiable by
  construction and stays green regardless of what the browser actually renders.

## Applies to

- Every `.test.tsx` and `.browser.test.tsx` under `packages/ui/src/`.

## Example

```tsx
// Correct — a browser test, because the assertion depends on real layout
// packages/ui/src/Button/Button.browser.test.tsx
const { height } = button.getBoundingClientRect();
expect(height).toBeCloseTo(32, 0);

// Wrong — jsdom never lays anything out, so this passes for any height, including a broken one
// packages/ui/src/Button/Button.test.tsx
const { height } = button.getBoundingClientRect();
expect(height).toBeCloseTo(32, 0);
```
