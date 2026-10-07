---
about: Drawer is already decided in the overlay ADR and CONTEXT.md (modal default true, modal = Dialog-style <dialog>, non-modal = page-layer at --vpg-layer-drawer); no scrim token, no logical-property or side-naming convention exists; Dialog's overlay state and <dialog> mechanics are internal hooks (useOverlayState, useModalDialog)
saw:
  - docs/adr/0024-overlay-layering-and-portal-ownership.md
  - CONTEXT.md
  - source/react-ui/packages/ui/src/Dialog/Dialog.tsx
  - source/react-ui/packages/ui/src/internal/useOverlayState.ts
  - source/react-ui/packages/ui/src/internal/useModalDialog.ts
  - source/react-ui/packages/ui/src/Dialog/Dialog.stylesheet.ts
  - source/react-ui/packages/ui/src/internal/overlayTree.tsx
  - source/react-ui/packages/ui/src/internal/useOverlayRoot.ts
  - source/react-ui/packages/ui/src/vitest.setup.ts
  - source/react-ui/packages/tokens/src/theme.ts
  - source/react-ui/packages/tokens/src/base-stylesheet.ts
  - source/react-ui/packages/ui/src/Dialog/Dialog.browser.test.tsx
---
Evidence is reading, not inference, unless marked.

- Decided, not open: `docs/adr/0024-overlay-layering-and-portal-ownership.md:52-55` ("Drawer"
  section): `Drawer` takes `modal` (default true). Modal = modal surface (`<dialog>` + showModal, no
  layer step, `data-vpg-overlay-root`, scroll lock). Non-modal = no marker, no inert, no focus trap,
  no scroll lock, `--vpg-layer-drawer`, FloatingTree member. Rejected "Drawer always modal" (`:81`).
  CONTEXT.md:143-158 repeats this (Stacking scale, Modal surface). Name is "Drawer"; "Sheet" appears
  nowhere in CONTEXT.md/ADRs/ui src (grep). No ADR for a Drawer beyond 0024 (grep -i drawer docs/adr).
- Shared primitives: Dialog's behaviour lives in two internal hooks. `internal/useOverlayState.ts`
  holds controlled/uncontrolled open state, vetoable `requestClose`, the overlay-tree node and the
  `useFloating` + `useDismiss(context, { outsidePress: false })` wiring that owns Escape; it needs no
  `<dialog>`, so a non-modal Drawer can take it alone. `internal/useModalDialog.ts` builds on it and
  holds the `<dialog>` mechanics (showModal/close effect, `cancel` de-duplication against the
  keydown, browser-forced-close undo, `method="dialog"` interception, backdrop-click detection).
  `Dialog.tsx` is the markup, stylesheet and `data-vpg-overlay-root` marker around
  `useModalDialog`. Other shared internals: `internal/overlayTree.tsx`, `useOverlayRoot.ts`.
  `outsidePress` is fixed `false` in `useOverlayState`; a non-modal Drawer that dismisses on outside
  press needs that made an option. Dialog.tsx:41-42 `className` goes on the `<dialog>`; backdrop
  click detection relies on the `<dialog>` having padding 0 and the panel filling it
  (Dialog.stylesheet.ts:11-12,37, useModalDialog.ts:135-141); `.vpg-dialog` CSS (max-width width-sm,
  radius-lg, entry `@starting-style` translateY/scale) is Dialog-specific. New hook code is bounded
  by 100% coverage over jsdom+chromium projects (vitest.config.ts thresholds), see
  dialog-native-modal-gotchas candidate.
- Tokens present (theme.ts): `--vpg-shadow-low|med|high` (:318-320), `--vpg-ease-standard|entrance|exit`
  (:307-309), `--vpg-layer-drawer` 1000 (:334), `--vpg-width-sm|md|lg|xl` (:263-266); durations
  fast/normal/slow are stylesheet-owned (base-stylesheet.ts:84-86) and collapse to 0.01ms under
  `prefers-reduced-motion: reduce` (:101-108). CONTEXT.md says `slow` is "a surface crossing the
  viewport" (CONTEXT.md:~127) - the right step for a drawer slide; Dialog uses `normal`.
  There is NO scrim token: Dialog scrim is `oklch(from var(--vpg-ink) l c h / 0.4)` (Dialog.stylesheet.ts:62).
  Tokens AGENTS.md:~59: a missing token "belongs here, not as an inlined guess" -> tokens change; ADR-0009
  allows a literal with reason only for container sizes. Components never need their own motion
  media query; the duration tokens do it.
- No RTL/logical convention for side: Dialog is centred (no side). Logical properties used only in
  Center.stylesheet.ts:18 (`margin-inline`); physical left/right elsewhere (ButtonGroup.stylesheet.ts:31-41,
  Dropdown.stylesheet.ts:84, Card.stylesheet.ts:29). `PopoverPlacement = top|bottom|left|right`
  (Popover.tsx:21) is the only side-like vocabulary. (grep for rtl/dir/inset-inline -> none.) A Drawer
  picking `start|end` would be new.
- Test split: jsdom has no showModal/close; vitest.setup.ts:31-41 stubs only toggle `open` + fire
  `close`. Dialog.browser.test.tsx covers top-layer paint (:111), backdrop alpha (:131), Tab/focus (:155),
  scroll lock via `html:has([data-vpg-overlay-root][open])` (:191; rule at base-stylesheet.ts:117), nested
  overlays (:247-:292), reduced motion via getAnimations (:314-). Geometry/edge anchoring and slide
  motion are browser-only (rule: .agents/rules/browser-test-for-anything-jsdom-cannot-resolve.md).
- Process rules: a new component needs a bundle-check entry (ui AGENTS.md "bundle-check/"), an
  index.ts named export, and a Storybook story in apps/storybook/src in the same PR
  (.claude/rules/ship-storybook-stories...; Dialog.stories.tsx exists as the sibling).
- Staleness caveat: the ADR was written ahead of Drawer; ADR-0024 has no status block (see
  adr-0024-number-collision candidate). Two files are numbered 0024, cite by filename.
