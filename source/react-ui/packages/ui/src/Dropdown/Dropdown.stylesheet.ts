/**
 * `<Dropdown>`'s own styles — the wrapper, the `role="combobox"` trigger and the clear button in
 * the field's trailing slot. The field's box is
 * `FieldShell`'s, composed with the extra class `.vpg-dropdown-control`; the floating listbox,
 * its options, the chip row and its chips are styled by the shared
 * `internal/listbox.stylesheet.ts`, which every combobox-shaped component in this package injects.
 *
 * Injected as an inline `<style>` rather than a `.css` import so the package can stay
 * `"sideEffects": false` (same approach as `Card`'s and `Popover`'s stylesheets).
 *
 * Every `--vpg-*` property is *read* here through `var()` and never assigned inline by the
 * component: an inline style declaration always wins over a stylesheet rule for the same property
 * on the same element, so an inline `--vpg-ink` would permanently shadow the dark-mode
 * reassignment in `@vipengele/react-tokens`'s base stylesheet and the trigger would stop adapting to
 * colour mode.
 *
 * Nothing here draws the field's chrome. The border, fill, corner radius, height, horizontal
 * padding, focus ring, danger border and hover fill are the shell's, read off the trigger as its
 * direct child; a second copy of any of them here draws a box inside the field's box, or a ring
 * inside its ring (ADR-0011). The trigger carries `outline: none` for the same reason — the shell
 * draws the focus ring, and the trigger's native outline would sit inside it.
 */
export const dropdownStylesheet = `
/* A block box the width of its container, like \`TextField\`: the field never widens as options
   are selected and never narrows below its container either. \`box-sizing: border-box\` keeps
   that width inclusive of the field's own border and padding.

   \`min-width: 0\` is what makes that hold in a flex or grid container. The initial \`auto\`
   resolves there to the automatic minimum size — the root's min-content, which a row of chips
   and a long trigger label make wide — and that floor outranks \`width: 100%\`, so the field
   pushes its track open and overflows whatever width the container was given. */
.vpg-dropdown {
  display: block;
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  color: var(--vpg-ink);
  font-family: var(--vpg-font-sans);
}

/* \`align-self: stretch\` gives the trigger the field's full height, so a click anywhere across it
   opens the listbox; a percentage height would collapse, because the shell's height is a floor
   rather than a definite length. */
.vpg-dropdown-trigger {
  display: flex;
  align-items: center;
  align-self: stretch;
  gap: var(--vpg-space-2);
  outline: none;
  color: inherit;
  font-size: var(--vpg-font-size-sm);
  line-height: 1.5;
  cursor: pointer;
  user-select: none;
}

/* The shell lets every centre element shrink to nothing, which beside a row of chips would leave
   the trigger — the only thing that opens the listbox — with no width at all. A square of the
   field's own height keeps it a target and keeps room for the chevron. Qualified by both classes
   the shell element carries, so it outranks the shell's own \`min-width: 0\` whichever stylesheet
   the page injects first. */
.vpg-field-shell.vpg-dropdown-control > .vpg-dropdown-trigger {
  min-width: var(--vpg-size-md);
}

.vpg-dropdown-trigger-icon,
.vpg-dropdown-chevron {
  flex: none;
}

/* Matches \`.vpg-listbox-option-icon\`: the same icon at the same size in the trigger as in
   the list it came from, rather than lucide's own 24px default. */
.vpg-dropdown-trigger-icon {
  width: var(--vpg-icon-md);
  height: var(--vpg-icon-md);
}

/* \`margin-left: auto\` is what sets the chevron against the field's trailing edge. A \`multiple\`
   trigger holding a selection contains the chevron and nothing else, so no sibling claims the
   trigger's free space and the chevron would otherwise sit at its leading edge, floating
   mid-field. The margin is inert wherever a \`flex: 1\` sibling has already absorbed that space —
   single-select's value and either mode's placeholder — since there is none left for it to take. */
.vpg-dropdown-chevron {
  margin-left: auto;
  color: var(--vpg-ink-muted);
}

/* Takes the trigger's free space, so the chevron's auto margin resolves to nothing and the label
   keeps the field's leading edge. */
.vpg-dropdown-value {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.vpg-dropdown-placeholder {
  flex: 1;
  color: var(--vpg-ink-subtle);
}

/* The clear button stands in the shell's trailing slot, a subtree the shell's \`> \` state rules do
   not reach into — so its focus ring is its own, and the field takes none from it. It carries no
   \`opacity\` either: the shell already dims for a disabled control, and a second fade here reads
   as more faded than the field around it. */
.vpg-dropdown-clear {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: none;
  appearance: none;
  padding: var(--vpg-space-1);
  background: none;
  border: none;
  border-radius: var(--vpg-radius-full);
  color: var(--vpg-ink-muted);
  cursor: pointer;
  transition: background-color var(--vpg-duration-fast) var(--vpg-ease-standard),
    color var(--vpg-duration-fast) var(--vpg-ease-standard);
}

.vpg-dropdown-clear-icon {
  flex: none;
  width: var(--vpg-icon-sm);
  height: var(--vpg-icon-sm);
}

.vpg-dropdown-clear:hover {
  background-color: var(--vpg-accent-wash);
  color: var(--vpg-ink);
}

.vpg-dropdown-clear:focus-visible {
  outline: var(--vpg-focus-ring-width) solid var(--vpg-accent-ring);
  outline-offset: var(--vpg-focus-ring-offset);
}

/* Names every selection to a screen reader while taking no space in the field, which is the only
   route to the chips the row has no width for: those are out of the flow altogether. */
.vpg-dropdown-selection-description {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
`;
