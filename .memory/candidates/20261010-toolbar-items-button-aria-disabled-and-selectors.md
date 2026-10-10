---
about: Button supports aria-disabled (focusable, dimmed, onClick swallowed, default prevented, click still propagates) while disabled/loading stay native; Toolbar is the one roving container over arbitrary children and finds items with ITEM_SELECTOR; Menu/Dropdown/Tree still implement aria-disabled separately
saw:
  - source/react-ui/packages/ui/src/Button/Button.tsx
  - source/react-ui/packages/ui/src/Button/Button.stylesheet.ts
  - source/react-ui/packages/ui/src/Toolbar/Toolbar.tsx
  - source/react-ui/packages/ui/src/internal/useRovingFocus.ts
  - source/react-ui/packages/ui/src/internal/menuPanel.tsx
  - source/react-ui/packages/ui/src/Menu/MenuButton.tsx
  - source/react-ui/packages/ui/src/Tabs/Tabs.tsx
  - source/react-ui/packages/ui/src/Tree/rowState.ts
---
Rewritten 2026-10-10 against the Toolbar branch (react-ui 0.1.x).

Button.tsx: native `disabled={disabled || loading}` is unchanged, so a disabled or loading Button leaves the tab order.
`aria-disabled` (`true` or `"true"`) swaps `onClick` for `preventActivation`, which only calls `preventDefault` (so a
submit button does not submit) and does not stop propagation: ancestors and document listeners still see the click
(outside-press dismissal relies on that), unlike a native-disabled button in Chromium, which delivers nothing to ancestors.
Button.stylesheet.ts dims `:disabled, [aria-disabled="true"]` alike and every hover/active rule is
`:not(:disabled):not([aria-disabled="true"])`.
MenuButton still passes `disabled` to Button (native), so a disabled MenuButton is NOT a Toolbar focus stop.

Item discovery: Toolbar.tsx `ITEM_SELECTOR` = natively enabled `button`, `a[href]`, visible `input`, `select`,
`textarea`, matched at any depth (reaches a nested ButtonGroup's buttons and MenuButton's inner Button; menu rows are
`div[role=menuitem]`, so they never match). Toolbar is the only roving container over arbitrary children and the only one
that writes `tabindex` imperatively (layout effect after every render, MutationObserver on childList plus
disabled/href/type, and on focus). Tabs queries `[role="tab"]:not([disabled])` and derives its stop from the selected
value; Menu registers rows through floating-ui; Tree uses its row model.

Other aria-disabled inert rows are hand-written per component and share nothing with Button: menuPanel.tsx rows
(disabled Menu rows stay focus stops, ADR 0030), Dropdown options, Tree rowState.ts.
ButtonGroup is CSS-only role=group (see candidate 20261007-buttongroup...); its styling depends on `.vpg-button` descendants.
