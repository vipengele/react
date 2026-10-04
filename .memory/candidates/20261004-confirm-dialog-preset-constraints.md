---
about: what a ConfirmDialog preset over Dialog is and is not constrained by - Dialog fixes role, owns no focus/pending policy, ships no strings; no ADR decides presets, i18n or async buttons
saw:
  - source/react-ui/packages/ui/src/Dialog/Dialog.tsx
  - source/react-ui/packages/ui/src/Button/Button.tsx
  - source/react-ui/packages/ui/src/Tag/Tag.tsx
  - source/react-ui/packages/ui/AGENTS.md
  - source/react-ui/packages/ui/README.md
  - source/react-ui/packages/ui/vitest.config.ts
  - docs/adr/0003-card-compound-components-with-runtime-validation.md
  - docs/adr/0015-a-project-is-the-unit-of-release.md
  - docs/adr/0001-theming-via-css-custom-properties-no-context-hook.md
---

Read, not inferred, unless marked (inference).

- No ADR or rule decides "preset over another component". Convention is AGENTS.md:35-40: compose
  only a component exported from `src/index.ts` (Dialog is, `index.ts:19`). Precedent: `Tag.tsx:35-75`
  composes `Badge`, takes `Omit<BadgeProps,...>`, spreads `...rest` into it, merges `className`
  (`["vpg-tag", className].filter(Boolean).join(" ")`), and still has its own stylesheet.
- Flat props are the default; ADR-0003:3-12 makes compound/validated children an exception to
  justify. Dialog is flat (`children`, no header/footer slots, `Dialog.tsx:34`).
- State: Dialog is controlled (`open`) or uncontrolled (`defaultOpen`), `onOpenChange(false)` for
  every close request, and the element closes only when open state says so (`Dialog.tsx:36-43`,
  `:102-109`) - so a controlled parent can veto Escape/backdrop. Blocking dismissal while pending
  is therefore done by ignoring `onOpenChange(false)` in the preset, plus `closeOnBackdropClick={false}`
  (`:45`). Escape has no prop; only the veto stops it. A browser-forced close (second Escape) is
  undone by re-`showModal()` (`:117-130`, `:157-166`).
- ref: React 19 `ref` is a prop, forwarded by hand to the `<dialog>` (`Dialog.tsx:51,210-218`).
  `className` lands on the `<dialog>`, not the panel (`:48`). `...aria` (aria-label XOR
  aria-labelledby, one required, `:21-31`) and `aria-describedby` go to the `<dialog>`.
  Dialog has NO `role` prop and no `style`/rest passthrough: native `<dialog>` implicit role is
  `dialog`, and a ConfirmDialog cannot make it `alertdialog` without adding a Dialog prop (inference:
  the `{...aria}` spread is typed only for aria-label/labelledby/describedby).
- Focus: Dialog writes no initial-focus code. Initial focus is the browser's `showModal()` default.
  `autoFocus` on a child would run at React mount, when the dialog is still closed (it opens in an
  effect, `:118-130`), so it is unlikely to land (inference, untested). The only focus test asserts
  Tab leaves the page inert and focus returns to the opener (`Dialog.browser.test.tsx:152-183`).
  Moving initial focus to Cancel needs either a Dialog change or a ref+effect in the preset.
- Async/loading: `Button` has `loading` (`Button.tsx:14-16,71`): disables, `aria-busy`, spinner,
  keeps label visually hidden. `variant="danger"` exists (`Button.tsx:6`, stylesheet `:90-100`).
  No ADR covers either; README Dialog example already shows Cancel `ghost` + Delete `danger` inside
  `Inline` (README.md:648-654). Dialog has no pending concept.
- i18n: no library-level strings policy. Only English literals in components: `Spinner label="Loading"`
  (`Spinner.tsx:28`), Dropdown `loadingMessage="Loading…"` (`Dropdown.tsx:858`), Tag `Remove ${children}`
  with `removeLabel` override (`Tag.tsx:40`), ErrorBoundary default title (ADR-0020). Precedent is
  "English default + overridable prop", not "required".
- Stylesheet: every stylesheet-bearing component injects `<style href="vpg-x" precedence="vpg-x">`
  (`Dialog.tsx:200`, `Button.tsx:68`, `Tag.tsx:67`). A preset adding no CSS needs no stylesheet; it
  renders Dialog and Button, which inject their own. ADR-0009 only bans `var()` fallbacks
  (enforced by no-fallback-var-reads.test.ts globbing src). No precedent found of a style-less
  composer (grep not exhaustive).
- hatua: only appears in ADR-0015:12 (release model) and ADR-0001:5 (`HatuaProvider.tsx` theme
  pattern), and Tree.stories.tsx:9,11 comments. No ADR says to mirror hatua's component API; the
  issue's "hatua ships one" is the only pointer. `hatua/` is not in this repo.
- Tests/gate: `vitest.config.ts:10-20` one coverage block, 100% statements/branches/functions/lines,
  reported across both projects. jsdom (`*.test.tsx`) lacks showModal; `vitest.setup.ts` stubs it
  with no cancel/inertness (see 20261004-dialog-native-modal-gotchas). Browser test for top layer,
  inertness, Escape, focus return. New component also needs a `bundle-check/run.mjs` entry
  (rule update-bundle-check-with-every-component; Dialog's is at `run.mjs:103`) and a story in
  `apps/storybook/src/ConfirmDialog.stories.tsx`. `.lydite/components.yml` is per package, no entry.

Stale in docs: AGENTS.md:104-106 and CONTEXT.md:143-145 name `drawer`/`menu` layers and Drawer, but
no Drawer/Menu component exists in `src/`. AGENTS.md has no Dialog bullet.
