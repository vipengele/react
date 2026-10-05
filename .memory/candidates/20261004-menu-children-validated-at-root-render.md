---
about: Menu validates its children in MenuRoot on every render, open or shut, so a wrong child throws at the call site rather than when the menu first opens; fragments are flattened, groups do not nest, and error names come from function names
saw:
  - source/react-ui/packages/ui/src/Menu/Menu.tsx
  - source/react-ui/packages/ui/src/Menu/Menu.test.tsx
---
- `assertMenuRows` runs in `MenuRoot` before the panel renders and also walks each `Menu.Group`'s
  children, with groups disallowed inside a group. `Children.toArray` drops null, undefined and
  booleans, so a row behind a condition is admitted; a `Fragment` is recursed into.
- Accepted types are checked by identity against `MenuItem`, `MenuCheckboxItem`, `MenuRadioItem`,
  `MenuSeparator` and (top level only) `MenuGroup`. A wrapper component that renders a `Menu.Item`
  is rejected, because its element type is the wrapper.
- `describeChild` names a rejected child by tag, component `name` or text. Component names are
  function names, which a minifier may mangle in a production build.
- `Menu.RadioItem` also needs `MenuGroupContext` and throws without an enclosing `Menu.Group`;
  every row throws outside a `Menu`.
