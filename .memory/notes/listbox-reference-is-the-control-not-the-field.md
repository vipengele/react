---
name: listbox-reference-is-the-control-not-the-field
kind: rationale
description: useListboxKeyboard attaches the field only as setPositionReference and keeps setReference on the trigger for the whole lifecycle, search mode included; search mode drives virtual navigation from an input inside the panel.
anchors:
  - path: source/react-ui/packages/ui/src/internal/useListboxKeyboard.ts
    blob: 917e1aea36fa
  - path: source/react-ui/packages/ui/src/Dropdown/Dropdown.tsx
    blob: c93c1265ac6d
  - path: source/react-ui/packages/ui/src/Popover/Popover.tsx
    blob: ae569b837f86
  - path: docs/adr/0013-dropdown-is-the-one-searchable-combobox.md
    blob: 8456314e6c45
confidence: verified
---

K = `source/react-ui/packages/ui/src/internal/useListboxKeyboard.ts`, D = `.../Dropdown/Dropdown.tsx`,
F = `@floating-ui/react` 0.27.20's `dist/floating-ui.react.mjs` under
`source/react-ui/node_modules/.pnpm/@floating-ui+react@0.27.20_*/`.

**Two anchors.** The field — the `FieldShell` box — is attached only as the *position* reference,
via a `fieldRef` callback calling `refs.setPositionReference` (K:160-166, call at K:163).
`refs.setReference` stays on the trigger, a `<div role="combobox">` (D:1096-1119, ref at D:1097),
so `elements.domReference` is the focusable control for the component's whole lifetime, search
mode included (K:102-106). ADR 0013 records the same (`0013-*.md:36`) and rejects swapping the
reference on open (`0013-*.md:168-174`).

**Why not put `setReference` on the field.** `elements.domReference` is read for more than the
portal's theme-root lookup (K:279):

- `useListNavigation` (F:3263-3807) derives `isTypeableCombobox(elements.domReference)` at
  F:3316, which changes key handling. (Its `elements.domReference.focus()` at F:3580 runs only in
  a `!virtual` branch, so it does not apply to this hook's `virtual: true`; ADR 0013:40 and K:104-105
  call it "focus restore" loosely.)
- `useClick` (F:2283-2376) gates space-key handling on `isSpaceIgnored(domReference)` at F:2343
  and F:2360, which is just `isTypeableElement` (F:2276-2278).

A field `div` is not focusable, so these would change silently, and a cast such as
`domReference as HTMLInputElement` hides it from TypeScript.

**Compensations for keeping it on the control**, both in the hook: `outsidePress` excludes the
field when one is attached (K:212-215, comment K:205-210), and `onFieldMouseDown` (K:168-183)
prevents the default and refocuses the reference so a press on padding or a chip gap does not
leave an open listbox with focus on `<body>`.

**Search mode puts real focus in an input, never in the listbox.** `search?: boolean` (K:54-57)
is the one mode where the caller wraps the floating element in a **non-modal**
`FloatingFocusManager` (K:95-100); modal would make the trigger and page unreachable. The only
caller is D:966 (`modal={false} initialFocus={searchRef}`, inside `renderSearchPanel`,
D:960-1007); the non-search path (`renderFloating`, D:1011-1029) has none. `Popover.tsx:131` is
the package's only *modal* use. Highlighting is still virtual via `aria-activedescendant`
(`docs/adr/0004-aria-activedescendant-for-dropdown-and-autocomplete.md`):

- The input can drive `useListNavigation` because its only `currentTarget`-identity check is
  gated on `!virtual` (F:3647). `getSearchProps()` (K:256-260) hands the input the same
  navigation/role prop getters the reference would carry, so no key is hand-forwarded.
- `getSearchProps()` deliberately omits `useClick` (K:250-255, K:79-83): the reference's
  `useClick` toggles on press (K:204), so on the input a caret-placing click would close the panel.
- Search mode's `useDismiss` closes on `click`, not `pointerdown` (K:223, reasoning K:216-222),
  so the focus manager's return-to-reference does not blank focus before the input claims it.
- `getFloatingProps()` goes on the `role="listbox"` element (D:999 search mode, D:1024 otherwise),
  never the panel: it sets `id: floatingId` (F:3868), the id every `aria-controls` names (F:3848),
  and on the panel that id would name a box that holds the search input too (D:955-959).

ADR 0013's focus-model section (`0013-*.md:34-67`) is the prose version of all of the above.
