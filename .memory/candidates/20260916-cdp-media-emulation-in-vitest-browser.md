---
about: "emulating a CSS media feature in this repo's browser tests goes through cdp() imported from vitest/browser"
saw:
  - "packages/ui/src/theme-motion.browser.test.ts"
  - "packages/ui/package.json"
  - "packages/ui/vitest.config.ts"
---

A browser test that has to assert behaviour under a media feature — `prefers-reduced-motion`,
and by the same route `prefers-color-scheme` or `forced-colors` — drives Chromium's own media
emulation over the DevTools protocol:

```ts
import { cdp } from "vitest/browser";

await cdp().send("Emulation.setEmulatedMedia", {
  features: [{ name: "prefers-reduced-motion", value: "reduce" }],
});
```

`packages/ui/src/theme-motion.browser.test.ts` does this and clears the override in `afterEach`,
without which the next file in the same worker inherits it.

**The import specifier is the part that costs time.** The context is documented as
`@vitest/browser/context`, which does not resolve from `packages/ui` under pnpm's isolated node
modules layout: `@vitest/browser` is only a transitive dependency there, and `package.json`
declares `@vitest/browser-playwright` instead. `vitest/browser` re-exports the same context and
its types resolve through the direct dependency, so it is the specifier that works here.

Two consequences worth knowing before reaching for this:

- It is Chromium-specific. `packages/ui/vitest.config.ts` declares a single `chromium` browser
  project, and a Firefox or WebKit project added later needs a different emulation route for any
  file using `cdp()`.
- Emulation is real — the query matches in the engine — so a test written this way observes the
  media rule actually applying, rather than asserting on the stylesheet text.
