# Add every new component to `bundle-check/` in the same change that ships it

`bundle-check/` is a real downstream Vite build asserting that importing one component from this
package's built `dist/` pulls in only that component. A check that names only the components
that existed when it was written proves nothing about the one just added — it stays green while
it silently stops covering the package.

## Applies to

- Any change adding, removing, or renaming a component exported from `packages/ui/src/index.ts`.
- `packages/ui/bundle-check/entry.js` and `packages/ui/bundle-check/run.mjs`.

## Example

Adding a new `Badge` component to `@tandiko/ui` in a PR must add a corresponding entry/assertion
for `Badge` to `bundle-check/` in that same PR — not as a follow-up.
