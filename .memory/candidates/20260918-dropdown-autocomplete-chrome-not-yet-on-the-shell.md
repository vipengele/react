---
about: Dropdown and Autocomplete still draw their own field chrome by two different mechanisms, and their outer element declares no width at all — the readable cause of the unbounded-chip-growth defect
saw:
  - packages/ui/src/Dropdown/Dropdown.stylesheet.ts
  - packages/ui/src/Autocomplete/Autocomplete.stylesheet.ts
  - packages/ui/src/FieldShell/FieldShell.stylesheet.ts
  - docs/adr/0011-the-field-shell-as-keystone.md
---

`FieldShell` owns the chrome of a text-entry control, and `TextField` composes it. `Dropdown` and
`Autocomplete` do not, so two mechanisms for the same idiom sit beside the shell's.

`Dropdown` puts border, background and focus ring on `.tandiko-dropdown-control`
(`Dropdown.stylesheet.ts:33-61`) and reads state off its sibling `.tandiko-dropdown-trigger` with
`:has()` (`:50-59`). The trigger stays unbordered because it carries floating-ui's merged handlers
and the `combobox` role — the comment at `Dropdown.tsx:332-335` explains why the chips are its
siblings rather than its children: floating-ui's handlers would otherwise intercept a nested remove
button's click. `Autocomplete` splits the same way but reads focus with `:focus-within`
(`Autocomplete.stylesheet.ts:45`) and invalidity with `:has()` (`:50`) — a third combination.

**The width asymmetry is the readable cause of the unbounded-chip-growth defect.**
`.tandiko-field-shell` declares `width: 100%; box-sizing: border-box` with a
`flex: 1; min-width: 0` centre (`FieldShell.stylesheet.ts:28-51`). `.tandiko-dropdown` and
`.tandiko-autocomplete` are `display: inline-block` with no width declared at all
(`Autocomplete.stylesheet.ts:20-21`); only the inner `-control` carries `min-width: 12rem`
(`:38`), with no `max-width` above it. A shrink-to-fit outer element with a floor and no ceiling
has nothing bounding it, so a wide chip row grows the control past its container.

This is read from the stylesheets. The symptom has not been reproduced on screen, and ADR 0011
records the causal claim as an unconfirmed diagnosis for exactly that reason
(`0011-the-field-shell-as-keystone.md`, "The shell owns width").

**Two shell behaviours a multi-element centre has to clear.** `FieldShell` gives `flex: 1` to
every centre child — `> *:not(.tandiko-field-shell-leading, .tandiko-field-shell-trailing)`
(`FieldShell.stylesheet.ts:49-52`) — so a centre of a chip row plus a trigger stretches each chip
equally rather than letting the trigger take the remainder. And the shell sets `height`, not
`min-height` (`:33`), so a chip row cannot wrap to a second line inside it. Both need answering by
whatever puts chips in the shell.
