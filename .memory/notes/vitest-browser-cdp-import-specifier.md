---
name: vitest-browser-cdp-import-specifier
kind: gotcha
description: Browser tests emulate media features via cdp() imported from "vitest/browser"; the documented "@vitest/browser/context" does not resolve from packages/ui.
anchors:
  - path: source/react-ui/packages/ui/src/theme-motion.browser.test.ts
    blob: cf70e4647ccb
  - path: source/react-ui/packages/ui/package.json
    blob: a63d2284f109
  - path: source/react-ui/packages/ui/vitest.config.ts
    blob: 869e816c7b00
confidence: verified
---

To assert behaviour under a media feature (`prefers-reduced-motion`, and by the same route
`prefers-color-scheme` or `forced-colors`), a browser test drives Chromium's own media emulation
over the DevTools protocol. In `source/react-ui/packages/ui/src/theme-motion.browser.test.ts`:

- the import is `import { cdp } from "vitest/browser"` (`:5`)
- the call is `cdp().send("Emulation.setEmulatedMedia", { features: [...] })`, and `features: []`
  clears it (`:43-45`, inside `emulateReducedMotion` at `:42-46`)
- the override is cleared in `afterEach` (`:48-50`). Without that, the next file in the same
  worker inherits the emulated preference.

**The import specifier is what costs time.** The Vitest docs name `@vitest/browser/context`, and
that does not resolve from `packages/ui`. pnpm's isolated layout exposes
`@vitest/browser-playwright` under `packages/ui/node_modules/@vitest/` because that is the declared
dependency (`source/react-ui/packages/ui/package.json:48`); `@vitest/browser` is only transitive
and has no entry there. `vitest/browser` re-exports the same context and resolves through the
direct `vitest` dependency.

Consequences:

- The route is Chromium-only. `source/react-ui/packages/ui/vitest.config.ts:42` declares a single
  `chromium` instance. If a Firefox or WebKit project is added, every file that calls `cdp()` needs
  a different emulation route.
- The emulation is real: the engine actually matches the query. A test written this way observes
  the media rule applying, not just the stylesheet text.
