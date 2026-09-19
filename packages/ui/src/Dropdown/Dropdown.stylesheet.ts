/**
 * `<Dropdown>`'s own styles — the wrapper and the `role="combobox"` trigger. The field's box is
 * `FieldShell`'s, composed with the extra class `.tandiko-dropdown-control`; the floating listbox,
 * its options, the chip row and its chips are styled by the shared
 * `internal/listbox.stylesheet.ts`, which every combobox-shaped component in this package injects.
 *
 * Injected as an inline `<style>` rather than a `.css` import so the package can stay
 * `"sideEffects": false` (same approach as `Card`'s and `Popover`'s stylesheets).
 *
 * Every `--tandiko-*` property is *read* here through `var()` and never assigned inline by the
 * component: an inline style declaration always wins over a stylesheet rule for the same property
 * on the same element, so an inline `--tandiko-ink` would permanently shadow the dark-mode
 * reassignment in `@tandiko/tokens`'s base stylesheet and the trigger would stop adapting to
 * colour mode.
 *
 * Nothing here draws the field's chrome. The border, fill, corner radius, height, horizontal
 * padding, focus ring, danger border and hover fill are the shell's, read off the trigger as its
 * direct child; a second copy of any of them here draws a box inside the field's box, or a ring
 * inside its ring (ADR-0011). The trigger carries `outline: none` for the same reason — the shell
 * draws the focus ring, and the trigger's native outline would sit inside it.
 */
export const dropdownStylesheet = `
/* Shrink-to-fit, so a dropdown sits inline at the width of what it shows, between a floor and its
   container. The ceiling is what bounds it: a shrink-to-fit box is never narrower than its own
   min-content, so without one a floor wider than the container, or a single chip wider than it,
   pushes the field past the container's edge. The floor itself yields to a container narrower
   than it for the same reason. */
.tandiko-dropdown {
  display: inline-block;
  box-sizing: border-box;
  /* The size of a container, not a step of anything: no scale carries a measurement this large,
     and a \`--tandiko-*\` name the theme never assigns advertises a theming hook that doesn't
     exist. */
  min-width: min(12rem, 100%);
  max-width: 100%;
  color: var(--tandiko-ink);
  font-family: var(--tandiko-font-sans);
}

/* \`align-self: stretch\` gives the trigger the field's full height, so a click anywhere across it
   opens the listbox; a percentage height would collapse, because the shell's height is a floor
   rather than a definite length. */
.tandiko-dropdown-trigger {
  display: flex;
  align-items: center;
  align-self: stretch;
  gap: var(--tandiko-space-2);
  outline: none;
  color: inherit;
  font-size: var(--tandiko-font-size-sm);
  line-height: 1.5;
  cursor: pointer;
  user-select: none;
}

/* The shell lets every centre element shrink to nothing, which beside a row of chips would leave
   the trigger — the only thing that opens the listbox — with no width at all. A square of the
   field's own height keeps it a target and keeps room for the chevron. Qualified by both classes
   the shell element carries, so it outranks the shell's own \`min-width: 0\` whichever stylesheet
   the page injects first. */
.tandiko-field-shell.tandiko-dropdown-control > .tandiko-dropdown-trigger {
  min-width: var(--tandiko-size-md);
}

.tandiko-dropdown-trigger-icon,
.tandiko-dropdown-chevron {
  flex: none;
}

.tandiko-dropdown-chevron {
  color: var(--tandiko-ink-muted);
}

/* Each takes the trigger's free space, which is what sets the chevron against the field's
   trailing edge. */
.tandiko-dropdown-value,
.tandiko-dropdown-summary {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tandiko-dropdown-placeholder {
  flex: 1;
  color: var(--tandiko-ink-subtle);
}
`;
