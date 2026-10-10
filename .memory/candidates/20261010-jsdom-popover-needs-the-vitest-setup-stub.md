---
about: jsdom implements neither showPopover nor hidePopover and hides every popover that is not :popover-open, so vitest.setup.ts stubs both by toggling an inline display
saw:
  - source/react-ui/packages/ui/src/vitest.setup.ts
  - source/react-ui/packages/ui/src/Toast/ToastRegion.test.tsx
---

- `vitest.setup.ts:42-56`: without the stub every test that mounts a `ToastRegion` throws
  `showPopover is not a function`, and jsdom's default stylesheet hides `[popover]` content from
  every role query because nothing ever matches `:popover-open` there. The stub sets and removes an
  inline `display: block`; the guard leaves a jsdom that implements the methods running its own.
- `MutationObserver` ordering and `moveBefore` are exercised in jsdom by stubbing
  `Element.prototype.moveBefore`; top-layer behaviour can only be proved in `*.browser.test.tsx`.
