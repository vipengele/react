/**
 * The floating listbox, the panel a search row turns it into, its options, a group's heading and
 * the line between two groups, the option checkbox and
 * the multi-select chip row — the parts every combobox-shaped component in this package renders
 * identically. It lives here, injected
 * under its own `<style href>` by each component that needs it, rather than being duplicated per
 * component or imported from one component's directory into another's.
 *
 * Injected as an inline `<style>` rather than a `.css` import so the package can stay
 * `"sideEffects": false` (same approach as `Card`'s and `Popover`'s stylesheets).
 *
 * Every `--vpg-*` property is *read* here through `var()` and never assigned inline by a
 * component: an inline style declaration always wins over a stylesheet rule for the same property
 * on the same element, so an inline `--vpg-surface-raised` would permanently shadow the
 * dark-mode reassignment in `@vipengele/react-tokens`'s base stylesheet and the listbox would stop
 * adapting to colour mode. The only inline styles any of these elements carry are floating-ui's
 * computed `position`/`top`/`left`/`width`, which are plain CSS properties holding a per-instance
 * coordinate and the panel's match to the field it anchors to.
 *
 * An option's own text is a control's text, so it takes the type scale's `sm` step rather than the
 * prose `md` one. The panel carries the elevation family's medium step, one below the popover's.
 */
export const listboxStylesheet = `
.vpg-listbox {
  position: absolute;
  z-index: var(--vpg-layer-listbox);
  box-sizing: border-box;
  margin: 0;
  padding: var(--vpg-space-1);
  /* The size of a container, not steps of anything: no scale carries a measurement this large,
     and a \`--vpg-*\` name the theme never assigns advertises a theming hook that doesn't
     exist. Width is floating-ui's inline style, matching the field exactly — this rule must
     never impose a floor wider than a narrow field, or the panel outgrows what it's anchored to. */
  max-height: 16rem;
  overflow-y: auto;
  background-color: var(--vpg-surface-raised);
  border: 1px solid var(--vpg-border);
  border-radius: var(--vpg-radius);
  box-shadow: var(--vpg-shadow-med);
  color: var(--vpg-ink);
  font-family: var(--vpg-font-sans);
  font-size: var(--vpg-font-size-sm);
  line-height: 1.5;
}

.vpg-listbox:focus-visible {
  /* The listbox takes DOM focus from nothing — the highlight is virtual — but it is still a
     focus target for a stray programmatic focus() call, and an invisible one reads as broken. */
  outline: var(--vpg-focus-ring-width) solid var(--vpg-accent-ring);
  outline-offset: var(--vpg-focus-ring-offset);
}

/* A search row turns the listbox into a panel holding two parts, and the floating element is then
   the panel rather than the listbox: it draws the surface \`.vpg-listbox\` draws for a listbox
   that is the floating element itself, and holds the search row still while the options scroll
   under it. \`overflow: hidden\` keeps the scrolling options inside the panel's rounded corners. */
.vpg-listbox-panel {
  position: absolute;
  z-index: var(--vpg-layer-listbox);
  box-sizing: border-box;
  overflow: hidden;
  background-color: var(--vpg-surface-raised);
  border: 1px solid var(--vpg-border);
  border-radius: var(--vpg-radius);
  box-shadow: var(--vpg-shadow-med);
  color: var(--vpg-ink);
  font-family: var(--vpg-font-sans);
  font-size: var(--vpg-font-size-sm);
  line-height: 1.5;
}

/* The scrolling half of the panel, at the same height \`.vpg-listbox\` stands at — the size of
   a container, not a step of anything, so no \`--vpg-*\` name stands for it. The search row
   above it is outside this box and so never scrolls out of reach. */
.vpg-listbox-options {
  padding: var(--vpg-space-1);
  max-height: 16rem;
  overflow-y: auto;
}

/* The panel's first row: the magnifier, then the input. Its lower border is the divider between
   the search and the options under it. The row stands at the same height as an option, so the
   panel's first two rows read as one rhythm. */
.vpg-listbox-search {
  display: flex;
  align-items: center;
  gap: var(--vpg-space-2);
  box-sizing: border-box;
  min-height: var(--vpg-size-md);
  padding-inline: var(--vpg-space-3);
  border-bottom: 1px solid var(--vpg-border);
}

.vpg-listbox-search-icon {
  flex: none;
  width: var(--vpg-icon-md);
  height: var(--vpg-icon-md);
  color: var(--vpg-ink-muted);
}

/* The input carries none of a field's chrome: the panel's own border is the box around it, and a
   border or focus ring here would draw a second box inside that one. The panel opens with the
   caret already in this input, which is what marks it as the focused element. */
.vpg-listbox-search-input {
  flex: 1;
  min-width: 0;
  appearance: none;
  padding: 0;
  background: none;
  border: none;
  outline: none;
  color: inherit;
  font-family: inherit;
  font-size: inherit;
  line-height: inherit;
}

.vpg-listbox-search-input::placeholder {
  color: var(--vpg-ink-subtle);
}

/* Not an option: it carries no role, is never highlighted and cannot be selected — it exists so
   a query matching nothing says so instead of leaving the panel blank. Its padding is an option's
   block padding, so the message stands as tall as the option it stands in for. */
.vpg-listbox-empty {
  padding: var(--vpg-space-2);
  color: var(--vpg-ink-subtle);
}

/* A heading, never a row the keyboard can reach: it is the group's name, and the options under it
   keep the indices they hold with no group around them. Its inline padding is an option's, so the
   heading and the labels beneath it share one left edge, and it takes the type scale's smallest
   step to read as a label over the rows rather than as one of them. */
.vpg-listbox-group-label {
  padding-block: var(--vpg-space-1);
  padding-inline: var(--vpg-space-3);
  color: var(--vpg-ink-subtle);
  font-size: var(--vpg-font-size-xs);
  font-weight: var(--vpg-font-weight-medium);
}

/* The line between one group and the next, drawn by the group that follows another. A rule rather
   than a border on the group itself: the line spans the padding the options sit inside, so it
   reaches the full width of the list rather than stopping at an option's edge. */
.vpg-listbox-separator {
  height: 1px;
  margin-block: var(--vpg-space-1);
  margin-inline: calc(var(--vpg-space-1) * -1);
  background-color: var(--vpg-border);
}

.vpg-listbox-option {
  display: flex;
  align-items: center;
  gap: var(--vpg-space-2);
  box-sizing: border-box;
  /* A row's height is a token read, not the sum of a padding and a line-height: min-height
     plus centred content holds it at the control scale's md step regardless of what the label's
     font metrics or an icon's box happen to add up to. */
  min-height: var(--vpg-size-md);
  padding-inline: var(--vpg-space-3);
  border-radius: var(--vpg-radius-sm);
  cursor: pointer;
  transition: background-color var(--vpg-duration-fast) var(--vpg-ease-standard);
  /* The highlight moves with the keyboard, not with the pointer, so an option must never look
     selectable-by-drag. */
  user-select: none;
}

/* The highlight is virtual — the option never takes DOM focus, so :focus/:hover cannot express
   it and the component sets this attribute from its own highlighted index instead. Highlight
   (background) and selection (a checkbox fill or a trailing check, never colour) read on
   different visual channels, so a row can carry both at once without either one washing out the
   other. */
.vpg-listbox-option[data-highlighted] {
  background-color: var(--vpg-surface-hover);
}

.vpg-listbox-option[aria-disabled="true"] {
  color: var(--vpg-ink-subtle);
  cursor: default;
}

.vpg-listbox-option-icon {
  flex: none;
  width: var(--vpg-icon-md);
  height: var(--vpg-icon-md);
  color: var(--vpg-ink-muted);
}

/* A single-select row's only selection signal: colour alone would fail WCAG 1.4.1, and
   \`aria-selected\` reaches assistive technology but not a sighted reader. Trailing edge matches
   the shadcn/Radix select convention. A multi-select row already carries the checkbox as its
   one encoding, so this mark never renders alongside it — \`Dropdown\` renders it only for a
   selected option outside \`multiple\`. */
.vpg-listbox-option-check {
  flex: none;
  width: var(--vpg-icon-md);
  height: var(--vpg-icon-md);
  color: var(--vpg-accent);
}

.vpg-listbox-option-label {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* A drawn box rather than an <input type="checkbox">: the option already carries
   role="option" + aria-selected, and a real checkbox inside it would be an interactive
   element nested in one. */
.vpg-listbox-checkbox {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: none;
  box-sizing: border-box;
  width: 1.125rem;
  height: 1.125rem;
  border: 1px solid var(--vpg-border-strong);
  border-radius: var(--vpg-radius-sm);
  color: var(--vpg-accent-contrast);
  transition: background-color var(--vpg-duration-fast) var(--vpg-ease-standard),
    border-color var(--vpg-duration-fast) var(--vpg-ease-standard);
}

.vpg-listbox-checkbox[data-checked] {
  background-color: var(--vpg-accent);
  border-color: var(--vpg-accent);
}

/* The row of chips a multi-select field shows beside its control. It is a direct child of the
   field's shell, sitting before the control, within the width the shell leaves it. Wrapping is
   the shape it takes when the field asks for more than one row: each further line grows the field
   downwards rather than overflowing it, because the shell's height is a floor.

   One row of chips stands the field at the control step, the same height it has with no chips,
   so selecting the first option never makes the field jump. The field's content box is the
   control step less its border — 30px at the default scale — and a chip is 24px, leaving 3px on
   each side. The spacing scale's smallest step is 4px, which would grow the field to 34px, so the
   row pads each edge by half of it: 2px, which a single row fits inside and the shell centres, and
   which keeps the top and bottom rows of a wrapped field clear of its border. The rows themselves
   are a whole step apart. */
.vpg-listbox-chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--vpg-space-1);
  padding-block: calc(var(--vpg-space-1) / 2);
}

/* One row, with the chips that do not fit measured out of it and an indicator standing for them.
   Which chips those are is the component's read, not a rule here: the attribute says the row
   collapses, and each chip the read excluded carries \`data-hidden\`.

   \`nowrap\` is what holds the field at the control step in the one case the read cannot resolve:
   a chip too wide to share the row with the indicator still shows, and wrapping would put the two
   on separate rows rather than shrinking the chip to the room the indicator leaves. */
.vpg-listbox-chips[data-collapsing] {
  flex-wrap: nowrap;
}

.vpg-listbox-chips[data-collapsing] > [data-hidden] {
  display: none;
}

/* The read that decides which chips fit needs every one of them on the row at its own width: a
   hidden chip has no width to weigh, a shrunk one reports the row's constraint rather than its
   label, and the row itself shrinks to whatever is left in it once some are hidden. This
   attribute is set and removed inside one synchronous measurement, so the state it describes
   never paints. */
.vpg-listbox-chips[data-collapsing][data-measuring] > * {
  display: inline-flex;
  flex: none;
}

/* A chip's height is a token read, not the sum of a padding and a line-height: a fixed height
   plus centred content holds it at the control scale's xs step regardless of the label's font
   metrics. Its end carries no padding, so the remove button's round hover fill sits concentric
   with the chip's own rounded end. */
.vpg-listbox-chip {
  display: inline-flex;
  align-items: center;
  gap: var(--vpg-space-1);
  box-sizing: border-box;
  height: var(--vpg-size-xs);
  padding-inline: var(--vpg-space-2) 0;
  background-color: var(--vpg-accent-wash);
  border: 1px solid transparent;
  border-radius: var(--vpg-radius-full);
  color: var(--vpg-ink);
  font-family: var(--vpg-font-sans);
  font-size: var(--vpg-font-size-sm);
  line-height: 1.5;
}

/* A chip never outgrows the row that holds it: a label too long for the field is cut short
   rather than pushing the chip, and the field with it, past the field's border.

   \`min-width\` is what lets it be cut short at all. A flex item's automatic minimum size is its
   content's, which for a chip is its label's longest word — so a chip holding one long word takes
   the whole row and pushes the overflow indicator out past the field's border. The label carries
   the ellipsis that keeps the shorter box readable. */
.vpg-listbox-chips > .vpg-listbox-chip {
  min-width: 0;
  max-width: 100%;
}

/* The indicator standing for the chips the row has no width for. A chip's box without a chip's
   remove button: the selection it covers is unpicked in the listbox, since the chip carrying it
   is not on screen to remove it from — so it pads both ends alike and keeps its own width, which
   is the width the read reserves before any chip is counted onto the row. */
.vpg-listbox-overflow-chip {
  display: inline-flex;
  align-items: center;
  flex: none;
  box-sizing: border-box;
  height: var(--vpg-size-xs);
  padding-inline: var(--vpg-space-2);
  background-color: var(--vpg-accent-wash);
  border: 1px solid transparent;
  border-radius: var(--vpg-radius-full);
  color: var(--vpg-ink-muted);
  font-family: var(--vpg-font-sans);
  font-size: var(--vpg-font-size-sm);
  line-height: 1.5;
  white-space: nowrap;
}

.vpg-listbox-chip-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* A square as tall as the chip's inside: the glyph plus a spacing step on every side, which at the
   default scale is 22px — the whole of the chip's height inside its border, so the target is as
   large as a 24px chip allows. */
.vpg-listbox-chip-remove {
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

.vpg-listbox-chip-remove-icon {
  flex: none;
  width: var(--vpg-icon-sm);
  height: var(--vpg-icon-sm);
}

.vpg-listbox-chip-remove:hover {
  background-color: var(--vpg-accent-wash);
  color: var(--vpg-ink);
}

.vpg-listbox-chip-remove:focus-visible {
  outline: var(--vpg-focus-ring-width) solid var(--vpg-accent-ring);
  outline-offset: var(--vpg-focus-ring-offset);
}
`;
