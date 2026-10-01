---
about: Dropdown loadOptions debounce+promise is the one place in ui where a render-captured scope would change what async code sees
saw:
  - source/react-ui/packages/ui/src/Dropdown/Dropdown.tsx
  - source/react-ui/packages/telemetry/README.md
---
useAsyncOptions (Dropdown.tsx:~479-545) calls the latest `loadOptions` via a ref from inside a setTimeout callback, so the consumer's function runs outside React render with no ambient scope in the browser. Wrapping the call as `Scope.propagate(scopeCapturedAtRender, () => load(query))` would carry the scope into the consumer's synchronous start of loadOptions; per telemetry README / ScopeProvider.browser.test, anything after the consumer's own first await is the consumer's job to re-enter. Constraint: the effect deliberately omits loadOptions from deps (ref pattern); a scope read via useScope would need the same ref treatment or a restart of the debounce on scope identity (scope is stable per mounted provider, so deps are safe). Inferred by reading, not prototyped.
