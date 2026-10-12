---
about: TopNav is the second useOverflowCollapse consumer, so the "Dropdown is the only caller" claim no longer holds; it supplies its own data-attribute CSS and keeps the overflow li rendered
saw:
  - source/react-ui/packages/ui/src/TopNav/TopNav.tsx
  - source/react-ui/packages/ui/src/TopNav/TopNav.stylesheet.ts
  - source/react-ui/packages/ui/src/internal/useOverflowCollapse.ts
---
The note `overflow-collapse-is-a-shared-internal-hook` says Dropdown is the only caller. `TopNav.tsx` (`useOverflowCollapse`
call in `TopNavImpl`) is a second one, with `itemSelector` `.vpg-top-nav-item` and `indicatorSelector`
`.vpg-top-nav-overflow`. It follows the note's contract: `TopNav.stylesheet.ts` carries its own
`data-collapsing` / `data-hidden` / `data-measuring` rules (Inline's stylesheet has none), the measured `ul` sits inside
`.vpg-top-nav-main` (the observed parent, `flex: 1 1 0; min-width: 0`), and the overflow `<li>` is rendered even when
nothing is hidden so `countHidden` can subtract the indicator. The `measureKey` is a JSON string of label text, href and
`current`, so a non-text label change re-measures only on resize.
