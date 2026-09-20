---
about: the chip row's min-width:0 rule is exercised and required by the existing narrow-field overflow test; a smaller overflow indicator would not have caught its absence
saw:
  - packages/ui/src/internal/listbox.stylesheet.ts
  - packages/ui/src/Dropdown/Dropdown.browser.test.tsx
---

`.tandiko-listbox-chips > .tandiko-listbox-chip { min-width: 0; max-width: 100%; }`
(`listbox.stylesheet.ts:304-307`) exists because a flex item's automatic minimum size is its
content's — for a chip, its label's longest word — so without it a chip holding one long word
takes the whole row and pushes the overflow indicator (and the row) past the field's border
(rule's own comment, `:297-303`).

Deleted the `min-width: 0;` declaration locally and ran the Dropdown browser suite: it fails
exactly one test, `"holds a chip too wide to share the row with the indicator on the row anyway"`
(`Dropdown.browser.test.tsx:399-421`), on the assertion at `:420`
(`indicator.getBoundingClientRect().right` no longer `<=` the field's right edge — measured
279.95 vs a 240px field). Restored the file afterward; `git status` shows no diff.

That test's field is 240px wide and its overflow indicator reads `"and 1 more"`
(`Dropdown.browser.test.tsx:417`) — wide enough, in the current Chromium build, to make the
regression visible. The rule's protection is real but is a function of the specific fixture width
and indicator text this test happens to use, not something guaranteed by the rule's presence
alone: a narrower field/shorter-indicator variant of the same test could pass with the rule
removed, the same way it can pass with the rule present. Anyone shrinking this test's dimensions
or its indicator text should re-run the same deletion check before trusting it still catches a
regression.
