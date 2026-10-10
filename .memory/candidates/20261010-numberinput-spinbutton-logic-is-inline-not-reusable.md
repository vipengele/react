---
about: NumberInput's spinbutton keyboard handling and locale parsing are private to NumberInput.tsx and shaped for one text input; nothing shared exists for segment editing, dates or Intl formatting
saw:
  - source/react-ui/packages/ui/src/NumberInput/NumberInput.tsx
  - source/react-ui/packages/ui/src/internal
  - docs/adr/0020-numberinput-owns-spinbutton-semantics-and-locale-parsing.md
  - source/react-ui/packages/ui/.agents/rules/hidden-input-for-locale-formatted-form-value.md
---

`ls src/internal`: disclosureGroup, flexKeywords, listbox.stylesheet, menuPanel, menuStylesheet,
overlayNesting/overlayTree, space, useControllableState, useListboxKeyboard, useModalDialog,
useOverlayRoot, useOverlayState. No segment-editing hook, no Intl/date helper, no dates module, no
roving-tabindex primitive. Greps for Local*/segment/hourCycle in packages found only
SegmentedControl (a radio-group button, unrelated, ADR-0029) and NumberInput. No ADR/note/candidate
records a segmented-field attempt or rejection beyond ADR-0025's note that segmented DateField is
the wave's largest cost (:103-104).

Reusable from NumberInput (all inline, copy the pattern, not importable): `keyIntent` maps
ArrowUp/ArrowDown to +1/-1 and Enter to commit, ignoring IME composition (`NumberInput.tsx:104-113`);
`assignRef` (:116ff); the display-string vs committed-value split; commit-on-blur/Enter/step only
(ADR-0020 :51-60); focused edit wins over controlled value (ADR-0020 :88-93); Enter must not
preventDefault and the commit is `flushSync`ed so the hidden input is current at native submit
(ADR-0020 :95-103); hidden input with canonical value, visible input without `name`, `disabled`
mirrored (ADR-0020 :105-113, rule hidden-input-for-locale-formatted-form-value). ARIA: spinbutton
role always; valuenow/valuetext omitted when empty (ADR-0020 :14-24), `aria-valuemin/max` only when
bounds exist; no wheel handling ever (ADR-0020 :34-41, rule no-wheel-scroll-value-changes).
Locale: NumberInput captures `Intl.NumberFormat().resolvedOptions().locale` at module scope
(`NumberInput.tsx:20`) with no locale prop; ADR-0025 :82-86 says this will change to the shared
Locale, so do not copy that line.
Conflict: NumberInput's step clamping and "typed out-of-range commits as typed" semantics are
numeric; time segments wrap (23 -> 00) so the clamp logic does not carry over.
`useControllableState` exists in internal and is the shared controlled/uncontrolled helper (not
read in detail).
