# @vipengele/react-telemetry

Telemetry for React, part of the vipengele design system.

```bash
pnpm add @vipengele/react-telemetry
```

React 19 and React DOM 19 are peer dependencies.

## Scopes in the React tree

`ScopeProvider` carries a [`@vipengele/ts`](https://www.npmjs.com/package/@vipengele/ts) `Scope`
through the React tree lexically. Each provider gives its subtree a child of the enclosing
provider's scope (or of `Scope.current()` outside any), holding its `attributes`; `useScope()`
returns that scope.

```tsx
import { Scope, ScopeProvider, useScope } from "@vipengele/react-telemetry";

function CheckoutButton() {
  const scope = useScope();

  const onClick = async () => {
    await submitOrder();
    // `scope` was captured at render; re-entering it reads `user.id` past the `await`.
    Scope.propagate(scope, () => log(Scope.current().get("user.id")));
  };

  return <button onClick={onClick}>Buy</button>;
}

<ScopeProvider attributes={{ "user.id": user.id }}>
  <CheckoutButton />
</ScopeProvider>;
```

Neither React context nor, in the browser, the ambient scope follows code across an `await`: past
the first native `await`, `Scope.current()` is back to the default scope. Capture the handle with
`useScope()` at render and re-enter it with `Scope.propagate(scope, fn)` wherever the code
resumes — after an `await`, in a timer, in an event listener.

### `ScopeProvider` props

| Prop         | Type                      | Default         | Description                                                                                         |
| ------------ | ------------------------- | --------------- | --------------------------------------------------------------------------------------------------- |
| `attributes` | `Record<string, unknown>` | `{}`            | The scope's own attributes. A change updates the same scope in place.                               |
| `tag`        | `string`                  | `'react.scope'` | The scope's Breadcrumb. Read once, at mount.                                                        |
| `isolate`    | `boolean`                 | `false`         | Parent the scope on the root, starting a Unit of Work that reads nothing above it. Read once, at mount. |
| `children`   | `ReactNode`               |                 |                                                                                                     |

The scope is created once per mounted provider and stays the same object for its lifetime.

- **Attribute changes land after the render that carries them.** A descendant reading
  `scope.get()` during that render, or in its own `useLayoutEffect`, sees the previous values;
  its `useEffect`s and event handlers see the new ones.
- **A key dropped from `attributes` reads `undefined`**, and shadows any value an enclosing scope
  holds for it.
- **The root's keys are reserved.** `service.name`, `service.version`,
  `deployment.environment.name` and `process.runtime.name` throw an error whose `code` is
  `common.scope.reserved-key`; match on the `code`, not on `instanceof`.

### `useScope()`

Returns the nearest enclosing provider's scope, or the default scope (`Scope.current()`) outside
any provider.

## Consumers

`Dropdown` in `@vipengele/react-ui` runs its `loadOptions` in the nearest enclosing provider's
scope.
