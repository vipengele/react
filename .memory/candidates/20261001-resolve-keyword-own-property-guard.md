---
about: why resolveKeyword guards with Object.hasOwn, and the test that pins it
saw:
  - source/react-ui/packages/ui/src/internal/flexKeywords.ts
  - source/react-ui/packages/ui/src/internal/flexKeywords.test.ts
---

`resolveKeyword` (`flexKeywords.ts`) looks a prop up in a plain object table. A bare `table[keyword]`
would resolve an inherited name such as `"toString"` to a function and write it into a
`--vpg-*-align`/`-justify` custom property, so the lookup checks `Object.hasOwn` first and falls back
to the default's value. `flexKeywords.test.ts` covers `"toString"` for both tables.
