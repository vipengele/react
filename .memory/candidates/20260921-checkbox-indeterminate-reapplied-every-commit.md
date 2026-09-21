---
about: why Checkbox re-applies the DOM indeterminate property in an effect with no dependency array, and why its labelled row is inline
saw:
  - source/react-ui/packages/ui/src/Checkbox/Checkbox.tsx
  - source/react-ui/packages/ui/src/Checkbox/Checkbox.test.tsx
  - source/react-ui/packages/ui/src/Checkbox/Checkbox.browser.test.tsx
  - source/react-ui/packages/ui/src/Checkbox/Checkbox.stylesheet.ts
---
- `indeterminate` has no HTML attribute; the browser clears the DOM property on click, and an uncontrolled checkbox does not re-render, so Checkbox.tsx writes it in a `useEffect` with no dependency array. A `[indeterminate]` dependency skips the commits where the prop is unchanged but the DOM has been cleared. Checkbox.test.tsx ("re-applies indeterminate on a re-render with unchanged props after a click cleared it") is the test that pins this.
- Glyph states are told apart only by the `::before` `content`/`background-color`/`opacity`; Checkbox.browser.test.tsx asserts them pairwise-distinct in Chromium, because jsdom resolves none of it.
- `.vpg-checkbox-row` is `inline-flex` (Checkbox.stylesheet.ts), matching RadioButton/Toggle being inline, so consecutive labelled Checkboxes directly inside a `FieldSet` sit on one line; the FieldSet sibling margin computes but separates nothing visually. Callers stack them with their own flex column.
