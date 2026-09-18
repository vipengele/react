---
about: no input-wrapper/field-shell abstraction exists yet; the three field-shaped components duplicate border/focus/invalid chrome through three different CSS mechanisms, and Dropdown/Autocomplete's outer element lacks TextField's explicit width — the likely source of the unbounded-chip-growth defect a FieldShell is meant to fix
saw:
  - packages/ui/src/TextField/TextField.tsx
  - packages/ui/src/TextField/TextField.stylesheet.ts
  - packages/ui/src/Dropdown/Dropdown.stylesheet.ts
  - packages/ui/src/Autocomplete/Autocomplete.stylesheet.ts
  - packages/ui/src/FormField/FormField.tsx
  - packages/ui/src/FieldSet/FieldSet.tsx
  - packages/ui/AGENTS.md
  - packages/ui/.agents/rules/update-bundle-check-with-every-component.md
---

New finding — no note in the store covered this. Staged ahead of ADR 0011 (FieldShell contract).

**No prior wrapper/shell abstraction was attempted.** `packages/ui/src/internal/` (the package's
only precedent for cross-component shared code) holds `listbox.stylesheet.ts` and
`useListboxKeyboard.ts` — nothing about field chrome. `FormField` (`FormField.tsx:79`) and
`FieldSet` (`FieldSet.tsx:24-36`) are pure label/layout wrappers via `cloneElement`
(`.agents/rules/wrap-trigger-never-clone.md`'s labelling carve-out) and a native `<fieldset>`;
neither touches the visual chrome (border/background/focus-ring) of the control it wraps. A grep
for "public api"/"class name" across `packages/ui/README.md`, every ADR and every rule in
`.agents/rules/` returns zero hits — no existing text treats a component's class names as a
committed public surface. ADR 0011 would be the first to say so explicitly.

**Today three components implement the same "bordered field with a focus ring and an invalid
state" idiom three different ways:**

- `TextField` (`TextField.stylesheet.ts:16-40`): the border/ring/invalid rules live directly on
  the single focusable `<input>` — no wrapper element at all. `display: block; width: 100%`
  (`:17-18`).
- `Dropdown` (`Dropdown.stylesheet.ts:19-59`): the visual chrome lives on
  `.tandiko-dropdown-control`, a sibling of the focusable `.tandiko-dropdown-trigger`
  (`role="combobox"`), reacting to the trigger's state via `:has()` (`:50-59`, comment at `:24-31`
  explains why — the trigger carries floating-ui's merged handlers and must stay unbordered
  itself). The outermost `.tandiko-dropdown` is `display: inline-block` with **no width set**
  (`:19-23`); only the inner `-control` has `min-width: 12rem` (`:38`), with no `max-width` or
  `width: 100%`.
- `Autocomplete` (`Autocomplete.stylesheet.ts:19-49`): same split (`-control` owns the chrome,
  the input is a sibling), but reacts via `:focus-within` (`:43-46`) rather than `:has()`, since
  the focusable element here is a plain `<input>`. Same `inline-block`-with-no-width outer element
  as Dropdown.

**This asymmetry is the likely root of the "unbounded chip growth" defect the plan attributes to
the shell.** `TextField` explicitly sizes itself to its container (`width: 100%`); `Dropdown` and
`Autocomplete` do not — their outer element's shrink-to-fit width has nothing bounding it except
whatever ancestor layout happens to constrain it, so a wide chip row grows the control rather than
wrapping or clipping. A `FieldShell` that owns width (and applies it uniformly, `width: 100%` like
`TextField`) would remove the asymmetry rather than patching Dropdown/Autocomplete individually.
Not verified by reproducing the visual bug (no repro exists in the repo — this is read from the
stylesheet diff, not from a screenshot or test), but the structural cause is directly readable.

**Structural constraints a FieldShell contract has to clear, from `packages/ui/AGENTS.md`:**
- One directory per component under `src/` (`.tsx` + `.stylesheet.ts` + `.test.tsx`), each
  re-exported individually from `src/index.ts` — "never a namespace barrel". If `FieldShell` is
  exported (the task states it is), it needs this shape, unlike `internal/`'s un-exported code.
- 100% statement/branch/function/line coverage (`vitest.config.ts`).
- `bundle-check/` must gain a `FieldShell` entry/assertion in the same change
  (`.agents/rules/update-bundle-check-with-every-component.md`) — and, per the existing
  `bundle-check-floating-ui-markers-lack-positive-control` note, any check that only asserts a
  marker's *absence* proves nothing without a bundle that includes it once, to show the marker
  would appear.
- A Storybook story in `apps/storybook/src/` in the same PR
  (`.claude/rules/ship-storybook-stories-with-every-component.md`).
- No `var(--tandiko-*, <literal>)` fallback anywhere in the shell's stylesheet
  (`no-fallback-var-reads.test.ts`, glob-driven — catches it even before the file exists, so this
  applies from the first draft).
