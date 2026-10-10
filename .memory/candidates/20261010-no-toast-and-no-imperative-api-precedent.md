---
about: no Toast component, ADR or imperative-API precedent exists; Toast is only specified as a layering rule in the overlay ADR, and the constraints on an imperative handle come from ADR-0001, ADR-0022 and ADR-0024
saw:
  - docs/adr/0024-overlay-layering-and-portal-ownership.md
  - docs/adr/0001-theming-via-css-custom-properties-no-context-hook.md
  - docs/adr/0022-non-visual-primitives-live-in-react-telemetry.md
  - CONTEXT.md
  - source/react-ui/packages/ui/src
  - source/react-ui/packages/telemetry/src/ScopeProvider.tsx
---

Checked 2026-10-10 for the "ADR: imperative component APIs" issue (vipengele/react#32).

- `grep -rniI toast source docs CONTEXT.md` -> only ADR-0024 (`:3`, `:47-49`, `:77-80`) and
  CONTEXT.md:162. `ls source/react-ui/packages/ui/src` has no Toast. No ADR on imperative APIs;
  `grep -rn imperative docs CONTEXT.md packages/*/AGENTS.md` -> 0 hits; no `useImperativeHandle` in src.
- ADR-0024 already fixes Toast's layering: region is `popover="manual"` (top layer, not modal),
  re-shows itself when a modal surface opens to stay on top. Rejected: page layer, and portaling
  into the open modal (moves DOM parents, rebuilds timers and live region).
- Constraints on an imperative handle reaching a provider: ADR-0001 forbids a JS-readable theme
  context (`useTheme`) and says theming is CSS-var only, so the provider cannot be found by theme;
  ADR-0022 puts non-visual context primitives (ScopeProvider/useScope) in react-telemetry, with
  `useScope()` returning a stable object per mounted provider (`ScopeProvider.tsx` doc comment);
  overlay portal target is `useOverlayRoot` (never `document.body`, ADR-0002/0024), so a
  module-level `toast.*` with no provider has no themed root to portal into.
- ADR-0024 is the overlay ADR; a second file also numbered 0024 is the Tree ADR. Cite by filename.
