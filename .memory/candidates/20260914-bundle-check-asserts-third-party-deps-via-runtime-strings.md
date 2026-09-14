---
about: bundle-check asserts a leaked third-party dependency by grepping the built bundle for runtime strings the dependency itself emits, not its import specifier or a component/export name
saw: packages/ui/bundle-check/run.mjs, packages/ui/src/Tooltip/Tooltip.tsx
---

`bundle-check/run.mjs`'s existing markers (`.tandiko-card {`, `.tandiko-tabs {`, etc.) are CSS
selectors from each component's own injected stylesheet string — safe because a bundler can't
rename or minify a string literal. The same trick doesn't obviously carry over to asserting a
*third-party dependency* doesn't leak: `FloatingFocusManager` (a `@floating-ui/react` export
name) was tried first and proved nothing, because Tooltip doesn't reference it at all — a probe
bundle importing only Tooltip tree-shook that name away regardless of whether floating-ui itself
was present.

What works: grep the built bundle for runtime strings `@floating-ui/react`'s own code emits
internally and unconditionally when any part of the library runs — `data-floating-ui` (an
attribute name floating-ui writes to the DOM) and `computePosition` (an internal function name
that survives minification because it's referenced dynamically). Asserting their absence from a
Button-only bundle, and their presence in a probe bundle that imports Tooltip, is what actually
proves the dependency does or doesn't leak. A future component adding a different third-party
dependency needs its own pair of markers verified the same way — an export name alone is not
enough.
