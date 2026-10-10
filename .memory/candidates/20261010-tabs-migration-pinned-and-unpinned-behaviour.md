---
about: what Tabs.test.tsx pins and leaves unpinned for a roving-hook migration (tab stop = selected unless disabled, then first enabled; no RTL; no browser test; no focus-follow of tab stop)
saw:
  - source/react-ui/packages/ui/src/Tabs/Tabs.tsx
  - source/react-ui/packages/ui/src/Tabs/Tabs.test.tsx
  - source/react-ui/apps/storybook/src/Tabs.stories.tsx
  - docs/adr/0030-menu-moves-real-focus-and-roving-tabindex.md
  - docs/adr/0024-tree-is-data-driven-with-roving-tabindex-over-a-flattened-row-model.md
---
Checked 2026-10-10 (react-ui 0.1.x, HEAD b2292f1).

Tabs.tsx facts: tab stop = `tabStopValue` (:258) = selected value, or `firstTabValue(children, true)` if the
selected tab is disabled (isTabDisabled :221). It is derived from children JSX walk, NOT from focus, so the tab
stop never follows last-focused. Traversal set is DOM query `[role="tab"]:not([disabled])` (:34, :72), modulo wrap
(:77,:79), Home/End (:80-83), only the orientation's arrow pair (:70), preventDefault only on handled keys (:88),
`target.focus()` then `activate(dataset.value)` (:92-93): focus-and-select in one step; consumer onKeyDown runs first (:68).
No RTL code in Tabs (Tree reads computed `direction`, Tree/keyboard.ts:26). Disabled tabs use native `disabled`.
All-disabled: selection falls back to the first tab (:252), tab stop = it, though unfocusable.

Pinned by Tabs.test.tsx (jsdom only; there is NO Tabs.browser.test): tab stop = selected (:107); horizontal pair
(:175), vertical pair (:186), wrap both ways (:195), Home/End (:204), off-axis ignored both orientations (:213,:219),
consumer onKeyDown called (:225), disabled skipped mid/end (:266,:273), disabled not tabbable (:260), click on
disabled no-op (:290), controlled-to-disabled moves stop to first enabled (:330), no tabs (:351).
Stories: Default, Vertical, DisabledTab, Controlled (Tabs.stories.tsx:14,35,56,108).

Unpinned (a hook could regress these silently): RTL (none exists), a tab removed/added while focused or selected,
Tab-key entry landing on the stop in a real browser, Home/End/arrow while focus is on a non-tab child of the list,
behaviour when event.target is not a tab (indexOf -1 -> ArrowRight lands on tabs[0]; ArrowLeft on last),
disabled-first-with-End, modifier keys (Ctrl/Alt+Arrow are not excluded).

ADR bearing: 0030 (Menu) "A roving hook shared with Tree and Tabs - rejected as part of this decision... separate
decision this ADR does not make"; 0024 (Tree) rejects a shared primitive and states Tabs' DOM-query roving is correct
only while every tab is mounted. The shared hook is decided in docs/adr/0032 (keyboard only, caller owns the tab stop);
`internal/useRovingFocus.ts` moves focus but does not activate, so a Tabs migration activates through its `onNavigate`
callback. The hook does not index a target that is not an item (no jump to the first tab) and ignores a keydown the
consumer's `onKeyDown` already defaulted-prevented. Numbers 0018,0020,0022,0024,0025,0027,0030 are duplicated in docs/adr/.
