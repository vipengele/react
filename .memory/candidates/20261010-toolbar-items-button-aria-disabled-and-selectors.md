---
about: Button has no aria-disabled support (native disabled only, no click guard); Menu/Dropdown/Tree implement aria-disabled separately; no shared focusable-selector constant exists; no component hosts arbitrary children under a roving container
saw:
  - source/react-ui/packages/ui/src/Button/Button.tsx
  - source/react-ui/packages/ui/src/Button/Button.stylesheet.ts
  - source/react-ui/packages/ui/src/internal/menuPanel.tsx
  - source/react-ui/packages/ui/src/internal/menuStylesheet.ts
  - source/react-ui/packages/ui/src/Menu/MenuButton.tsx
  - source/react-ui/packages/ui/src/Tabs/Tabs.tsx
  - source/react-ui/packages/ui/src/Tree/rowState.ts
---
Checked 2026-10-10.

Button.tsx: `disabled={disabled || loading}` native attr (:71), `{...rest}` spread BEFORE className/disabled (:71) so a
caller-passed `aria-disabled` reaches the DOM but Button does nothing with it: no onClick suppression, no class.
CSS dims only `.vpg-button:disabled` (opacity .55, cursor not-allowed; Button.stylesheet.ts:42-46) and hover/active
use `:not(:disabled)` (:54-99), so aria-disabled would hover/press normally. A focusable-but-inert toolbar Button
needs: onClick guard, `[aria-disabled="true"]` styling and hover exclusion. Native disabled removes it from focus,
so a roving container that must keep disabled items focusable cannot use Button's `disabled`.
Precedents for aria-disabled inert rows (each hand-written, none shared with Button): menuPanel.tsx:277 +
activate() early-return (:259-262), menuStylesheet.ts:79,125; Dropdown option Dropdown.tsx:155 + listbox.stylesheet.ts:179;
Tree rowState.ts:59 + Tree.stylesheet.ts:59,76. ADR 0030: disabled Menu rows stay focus stops
(`disabledIndices` empty). MenuButton passes `disabled` to Button (native; MenuButton.tsx:31-33) so a disabled
MenuButton is NOT focusable; Menu wraps trigger in a span and never clones the ref/handlers (rule wrap-trigger-never-clone.md;
cloning only plain ARIA props). jsdom caveat: click on a disabled button still bubbles to the wrapper span in jsdom but not Chromium
(see candidate 20261004-menu-jsdom-clicks...).

Item discovery: only DOM-query style exists, Tabs.tsx:34/72 (attribute selector on `role`), Menu uses floating-ui
FloatingList/useListItem registration, Tree uses a data model. `grep -rn querySelectorAll src` = Tabs, ConfirmDialog
(`"button"`), Dropdown chip measuring only. NO shared focusable/tabbable selector constant anywhere in src (grep
focusable|tabbable: only comments and Tree's `tabbableRow`). No existing roving container accepts arbitrary child
elements: Tabs wants `role=tab` buttons, Menu rows are its own components, Tree is data-driven. A Toolbar would be
the first, so it needs a marker/selector contract (e.g. role or data attribute) decided in an ADR.
Text-input key conflict: not handled in any roving code. Closest: Menu typeahead Space guard (menuPanel.tsx ~:283),
Tree `isTypeAheadKey` modifier filter (Tree/keyboard.ts:~50). Tabs' handler does not check event.target is editable.
ButtonGroup is CSS-only role=group (see candidate 20261007-buttongroup...); its styling depends on `.vpg-button` descendants.
