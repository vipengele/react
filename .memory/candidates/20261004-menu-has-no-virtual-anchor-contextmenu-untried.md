---
about: Menu is built and wholly trigger-element-anchored; a point-anchored ContextMenu would silently lose the portal/theme root, trigger ARIA, click toggle and focus return; no ADR or note records context menus, long-press or virtual anchors as tried or rejected
saw:
  - source/react-ui/packages/ui/src/Menu/Menu.tsx
  - source/react-ui/packages/ui/src/internal/useOverlayRoot.ts
  - source/react-ui/packages/ui/src/internal/useListboxKeyboard.ts
  - docs/adr/0030-menu-moves-real-focus-and-roving-tabindex.md
  - docs/adr/0026-menu-and-dropdown-are-separate-components.md
  - docs/adr/0024-overlay-layering-and-portal-ownership.md
---

Found planning a `ContextMenu` (checked 2026-10-04). Earlier candidates say Menu is "specified, not built"; that is out of date: `src/Menu/{Menu,MenuButton}.tsx` exist and are exported from `src/index.ts`.

- Anchor is `refs.setReference` on a wrapper `<span>` (Menu.tsx:292-301). `useFloating` is given no position reference or virtual element.
- `useOverlayRoot(elements.domReference)` (Menu.tsx:280) resolves the portal via `reference?.closest(...)` (useOverlayRoot.ts:~32). With a virtual point there is no DOM reference, so root is null and the panel renders inline, outside `.vpg-root` unless the caller supplies one, or inside a modal surface it should have portalled into. Fix: pass the contextElement/area wrapper to `useOverlayRoot`.
- `useClick` + `useRole` (Menu.tsx:184-186) belong to the trigger: click toggles, role pairs aria-haspopup/expanded/controls onto it. A context-menu target must not toggle on click and has no menu-button semantics.
- `FloatingFocusManager` returns focus to the reference on close (ADR 0030 "Focus path"); a point anchor needs an explicit return target (the area, or the previously focused element).
- Only precedent for a second position anchor: `refs.setPositionReference` in `useListboxKeyboard.ts:181`, for the Dropdown field (see note listbox-reference-is-the-control-not-the-field). It keeps `setReference` on the focusable control; positioning-only references are an established pattern, virtual `{getBoundingClientRect}` elements are not used anywhere.
- `grep -rniE 'context.?menu|long.?press|virtual (anchor|element)|contextmenu|touch' docs/adr source/react-ui/packages/ui/src` -> no hits. ADR 0030 says "Submenus are not supported" and nothing about context menus. Open decision, never tried or rejected.
- Conventions a Menu-derived component trips: wrap-trigger-never-clone, portal via useOverlayRoot, update-bundle-check (run.mjs:76 lists Menu), pure-annotate compound export, a story in apps/storybook/src in the same PR, 100% coverage. Duplicate ADR numbers exist; cite by filename.
