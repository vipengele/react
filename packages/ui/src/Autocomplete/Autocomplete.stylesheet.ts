/**
 * `<Autocomplete>`'s own styles — the wrapper, the chip row, the `role="combobox"` text input, the
 * chevron and the empty-result message. The field's box is `FieldShell`'s, composed with the extra
 * class `.tandiko-autocomplete-control`; the floating listbox, its options and the chips themselves
 * are styled by the shared `internal/listbox.stylesheet.ts`, which every combobox-shaped component
 * in this package injects.
 *
 * Injected as an inline `<style>` rather than a `.css` import so the package can stay
 * `"sideEffects": false` (same approach as `Card`'s and `Popover`'s stylesheets).
 *
 * Every `--tandiko-*` property is *read* here through `var()` and never assigned inline by the
 * component: an inline style declaration always wins over a stylesheet rule for the same property
 * on the same element, so an inline `--tandiko-ink` would permanently shadow the dark-mode
 * reassignment in `@tandiko/tokens`'s base stylesheet and the input would stop adapting to colour
 * mode.
 *
 * Nothing here draws the field's chrome. The border, fill, corner radius, height, horizontal
 * padding, focus ring, danger border and hover fill are the shell's, read off the input as its
 * direct child; a second copy of any of them here draws a box inside the field's box, or a ring
 * inside its ring (ADR-0011). The input carries `outline: none` for the same reason — the shell
 * draws the focus ring, and the input's native outline would sit inside it.
 */
export const autocompleteStylesheet = `
/* Shrink-to-fit, so an autocomplete sits inline at the width of what it shows, between a floor and
   its container. The ceiling is what bounds it: a shrink-to-fit box is never narrower than its own
   min-content, so without one a floor wider than the container, or a single chip wider than it,
   pushes the field past the container's edge. The floor itself yields to a container narrower
   than it for the same reason. */
.tandiko-autocomplete {
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

/* The chips wrap onto further lines within the width the shell leaves them, which grows the field
   downwards; the shell's height is a floor, not a fixed length. */
.tandiko-autocomplete-chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--tandiko-space-1);
  padding-block: var(--tandiko-space-1);
}

/* A chip never outgrows the row that holds it: a label too long for the field is cut short
   rather than pushing the chip, and the field with it, past the field's border. */
.tandiko-autocomplete-chips > .tandiko-listbox-chip {
  max-width: 100%;
}

.tandiko-autocomplete-chip-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* \`align-self: stretch\` gives the input the field's full height, so a click anywhere across it
   focuses the input; a percentage height would collapse, because the shell's height is a floor
   rather than a definite length. A native input inherits neither font nor colour from its
   ancestors, so both are declared here or the field renders in the UA's form defaults.

   \`width: 0\` sizes nothing on screen — the shell's \`flex: 1\` hands the input the field's free
   space — but it is the input's intrinsic contribution to a shrink-to-fit root. Without it the
   UA's twenty-character default width is what the field's width is computed from, and the field
   stands wider than its floor with nothing in it. */
.tandiko-autocomplete-input {
  box-sizing: border-box;
  align-self: stretch;
  width: 0;
  appearance: none;
  padding: 0;
  border: none;
  outline: none;
  background: none;
  color: inherit;
  font-family: inherit;
  font-size: var(--tandiko-font-size-sm);
  line-height: 1.5;
}

/* The shell lets every centre element shrink to nothing, which beside a row of chips would leave
   the input — where the next query is typed — with no width at all. A square of the field's own
   height keeps it a target. Qualified by both classes the shell element carries, so it outranks
   the shell's own \`min-width: 0\` whichever stylesheet the page injects first. */
.tandiko-field-shell.tandiko-autocomplete-control > .tandiko-autocomplete-input {
  min-width: var(--tandiko-size-md);
}

.tandiko-autocomplete-input::placeholder {
  color: var(--tandiko-ink-subtle);
}

/* The chevron takes the field's full height, so the whole strip beside the input is a target for
   it rather than just the glyph. The trailing slot is a direct child of the shell and is stretched
   for the same reason. It takes no focus, so it has no focus or disabled state of its own to
   style; the field's hover fill already reaches it through the shell. */
.tandiko-autocomplete-control > .tandiko-field-shell-trailing {
  align-self: stretch;
}

.tandiko-autocomplete-chevron {
  display: flex;
  align-items: center;
  align-self: stretch;
  color: var(--tandiko-ink-muted);
  cursor: pointer;
}

/* Not an option: it carries no role, is never highlighted and cannot be selected — it exists so
   a query matching nothing says so instead of closing the listbox. Its padding is an option's
   block padding, so the message stands as tall as the option it stands in for. */
.tandiko-autocomplete-empty {
  padding: var(--tandiko-space-2);
  color: var(--tandiko-ink-subtle);
}
`;
