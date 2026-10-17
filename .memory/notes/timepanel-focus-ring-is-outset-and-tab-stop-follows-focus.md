---
name: timepanel-focus-ring-is-outset-and-tab-stop-follows-focus
kind: gotcha
description: TimePanel's focus ring must be drawn outside the option and its tab stop must follow the focused option, because an inset translucent ring vanishes on the selected fill and a fixed selected-option tab stop breaks Tab in Chromium.
anchors:
  - path: source/react-ui/packages/ui/src/TimePanel/TimePanel.stylesheet.ts
    blob: 522bc9139911
  - path: source/react-ui/packages/ui/src/TimePanel/TimePanel.tsx
    blob: 836088e9b2a8
  - path: source/react-ui/packages/ui/src/TimePanel/TimePanel.browser.test.tsx
    blob: b207698e9c66
confidence: suspect
---

`--vpg-accent-ring` is `--vpg-accent` at partial alpha and the selected `.vpg-time-panel-option` is filled with solid
`--vpg-accent`. An inset ring (`outline-offset: calc(var(--vpg-focus-ring-offset) * -1)`, as Tabs and SegmentedControl use)
composites back to the fill colour, so the selected option, where Tab lands first, shows no focus. The stylesheet therefore draws
the ring outward with `var(--vpg-focus-ring-offset)` and pads the strip by ring width plus offset so the scroll container does not
clip it. A computed-style assertion alone passes either way; only the offset sign tells them apart.

`tabStopOf` in `TimePanel.tsx` makes the focused option the tab stop while focus is on the panel, falling back to the last-focused
strip's selected option once focus leaves. Making the selected option the tab stop unconditionally breaks the single tab stop in a
real browser: from a `tabindex=-1` option a key moved to, Tab goes to the next tabbable element in DOM order, which can be the
`tabindex=0` selected option later in the same strip. Each strip also carries `tabIndex={-1}` because Chromium makes a scroll
container with no tabbable descendant a tab stop of its own. jsdom reproduces neither; `TimePanel.browser.test.tsx` covers both.
