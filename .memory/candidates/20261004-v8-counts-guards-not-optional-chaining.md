---
about: with the 100% v8 coverage gate, an unreachable `if (ref.current === null) return` guard in an effect is an uncovered branch, while optional chaining on the same ref is not counted as one
saw:
  - source/react-ui/packages/ui/src/Breadcrumbs/Breadcrumbs.tsx
  - source/react-ui/packages/ui/src/Breadcrumbs/Breadcrumbs.test.tsx
---

- The focus effect in `Breadcrumbs.tsx` reads `listRef.current` through `list?.contains(...)`, `list?.children[index]?.querySelector(...)` and `list?.focus()`. The `<ol>` is always mounted when the effect runs, so an explicit `if (list === null) return` could never be taken and the gate failed at 97.5% branches with one uncovered line.
- v8 does not count `?.` as a branch, but it does count the right side of `?? []` (an attempt with `Array.from(list?.children ?? [])` left that uncovered), which is why the loop indexes `list?.children[index]` instead.
- `/* v8 ignore */` was not used: the repo holds components to 100% by writing reachable code.
