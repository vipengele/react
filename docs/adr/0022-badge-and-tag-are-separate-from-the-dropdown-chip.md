# Badge and Tag are separate from the Dropdown chip

`Badge` and `Tag` are their own primitives, each with its own markup and its own stylesheet. Neither
reuses the chip a multi-select `Dropdown` draws for a selection, nor the styles in
`source/react-ui/packages/ui/src/internal/listbox.stylesheet.ts`. `Dropdown` does not change.

The chip is not a standalone element. It is inline JSX in the `ChipRow` component of
`src/Dropdown/Dropdown.tsx`, styled by `.vpg-listbox-chip*` rules in the listbox stylesheet, and it
is coupled to the machinery that collapses a row of chips onto one line:

- `measureHiddenChips` reads the row's chips and the overflow indicator by class name
  (`.vpg-listbox-chip`, `.vpg-listbox-overflow-chip`).
- The `data-collapsing`, `data-measuring` and `data-hidden` attributes drive the stylesheet's
  collapse and measure rules. They are part of how the row works, not decoration on a chip.
- `Dropdown.test.tsx`, `Dropdown.browser.test.tsx` and `internal/listbox.browser.test.tsx` select
  chips by those class names, so the names are pinned.

`Tag` is the later component that most resembles the chip: a labelled mark that can carry a remove
control. That resemblance is why the question comes up, and it is why the answer is recorded here.

## Considered options

- **Promote the Dropdown chip into a shared primitive** that `Badge`, `Tag` and `Dropdown` all
  render. It would give one chip look in three places, and a visual change would be made once.
  Rejected because the chip cannot be lifted out of `Dropdown` without taking its coupling with
  it. Promoting it means rewriting the inline JSX in `ChipRow`, the `.vpg-listbox-chip*` rules,
  `measureHiddenChips` and the three data attributes it depends on, and the tests that pin the
  class names, in order to shape a primitive that two static components could not use as it
  stands. `Badge` has no remove control and no collapse behaviour, so most of what the chip
  carries is dead weight to it. The cost lands on `Dropdown`, which is working and unrelated to
  either new component.
- **Share only the stylesheet**, by having `Badge` and `Tag` read the `.vpg-listbox-chip*` rules.
  Rejected because the rules are written for a chip inside a measured row (the
  `.vpg-listbox-chips > .vpg-listbox-chip` selector and the `[data-hidden]` rule), and because a
  change to the listbox stylesheet would then restyle components that have nothing to do with a
  listbox.

Two components that look alike today are free to drift apart. If `Tag` and the chip converge enough
to share markup, that is a decision for the component that needs it, made with `Dropdown`'s
collapse behaviour in view.
