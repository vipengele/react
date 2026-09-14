---
about: '@tandiko/ui' declares '@tandiko/icons' as a real dependency, not a peer, because it uses icon components as runtime values
saw: packages/ui/package.json, packages/ui/src/Button/Button.tsx, packages/ui/src/Avatar/Avatar.tsx
---

`@tandiko/ui` takes `@tandiko/icons` as an ordinary `dependencies` entry (`workspace:*`), the
same treatment `@tandiko/icons` itself gives `lucide-react` — not a `peerDependencies` entry
like React/React DOM. The distinction tracks whether the package needs the dependency's runtime
values or only its types:

- `Button`'s `leadingIcon`/`trailingIcon` props are typed against `@tandiko/icons`'
  `IconComponent` — a type-only import, fully erased under `verbatimModuleSyntax`, so nothing
  from `@tandiko/icons` ends up in `@tandiko/ui`'s built `dist/index.js` from Button alone.
- `Avatar` imports the actual `User` icon component and renders it as its final fallback (after
  `src` and `initials` both fail) — a real runtime import, which is what makes `dependencies`
  (not `peerDependencies`) the correct declaration: a consumer installing `@tandiko/ui` must get
  `@tandiko/icons` transitively, since nothing forces them to have installed it themselves the
  way React is expected to already be present.

`@tandiko/icons`'s curated set had no person/user icon before this; `packages/ui`'s Avatar task
added `User` (lucide id `"user"`) to `packages/icons/src/icons.ts` and `index.ts` specifically to
give Avatar something to fall back to.

A future `@tandiko/ui` component that only needs an icon *type* (e.g. accepting a caller-supplied
icon as a prop) doesn't need this reasoning to change — the dependency stays real either way,
since some other component in the same package already needs the runtime value.
