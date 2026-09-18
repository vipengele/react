---
name: vitest-browser-cdp-import-specifier
kind: gotcha
description: Browser tests emulate media features via cdp() imported from "vitest/browser"; the documented "@vitest/browser/context" does not resolve from packages/ui.
anchors:
  - path: packages/ui/src/theme-motion.browser.test.ts
    blob: 9b4931f704c0
  - path: packages/ui/package.json
    blob: 418cf46469e4
  - path: packages/ui/vitest.config.ts
    blob: 869e816c7b00
confidence: verified
---

To assert behaviour under a media feature (`prefers-reduced-motion`, and by the same route
`prefers-color-scheme` or `forced-colors`), a browser test drives Chromium's own media emulation
over the DevTools protocol:

- the import is `import { cdp } from "vitest/browser"` (`packages/ui/src/theme-motion.browser.test.ts:5`)
- the call is `cdp().send("Emulation.setEmulatedMedia", { features: [...] })`, and `features: []`
  clears it (`theme-motion.browser.test.ts:42-46`)
- the override is cleared in `afterEach` (`theme-motion.browser.test.ts:48-50`). Without that, the
  next file in the same worker inherits the emulated preference.

**The import specifier is what costs time.** The Vitest docs name `@vitest/browser/context`, and
that does not resolve from `packages/ui`. pnpm's isolated layout exposes only
`@vitest/browser-playwright` under `packages/ui/node_modules/@vitest/`, because that is the
declared dependency (`packages/ui/package.json:47`); `@vitest/browser` is only transitive.
`vitest/browser` re-exports the same context, and it resolves through the direct `vitest`
dependency.

Consequences:

- The route is Chromium-only. `packages/ui/vitest.config.ts:34-45` declares a single `chromium`
  browser instance. If a Firefox or WebKit project is added, every file that calls `cdp()` needs
  a different emulation route.
- The emulation is real: the engine actually matches the query. A test written this way
  observes the media rule applying, not just the stylesheet text.
