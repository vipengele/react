---
about: ButtonGroup is a CSS-only role=group wrapper with no keyboard, context or cloneElement; a Toolbar does not subsume it, and no ADR/rule governs deleting an exported component (pre-1.0 = minor bump, release notes name old/new spelling)
saw:
  - source/react-ui/packages/ui/src/ButtonGroup/ButtonGroup.tsx
  - source/react-ui/packages/ui/src/ButtonGroup/ButtonGroup.stylesheet.ts
  - source/react-ui/packages/ui/src/index.ts
  - source/react-ui/packages/ui/bundle-check/run.mjs
  - source/react-ui/apps/storybook/src/ButtonGroup.stories.tsx
  - docs/release-notes/react-ui@v0.1.0.md
  - .claude/skills/release/SKILL.md
  - docs/adr/0003-card-compound-components-with-runtime-validation.md
  - docs/adr/0030-menu-moves-real-focus-and-roving-tabindex.md
---

Found planning an ARIA Toolbar whose issue says "resolve against ButtonGroup" (checked 2026-10-07, react-ui 0.1.1).

- ButtonGroup.tsx: props = HTMLAttributes<div> + `orientation` ("horizontal"|"vertical"), renders
  `<div role="group" class="vpg-button-group vpg-button-group-<orientation>">`. No keyboard handler, no
  tabIndex, no aria-orientation, no context, no cloneElement; children are plain `<Button>`.
  Segmented look = descendant selectors on `.vpg-button` (stylesheet: `> .vpg-button:first-child` radius,
  `+ .vpg-button { margin-left/top: -1px }`, hover/focus-visible z-index 1). So Button's class name is a
  contract. Role comment cites biome-ignore useSemanticElements (fieldset rejected).
- Consumers: only index.ts:7-10 export, its own test, its story (3 stories), README `### ButtonGroup`,
  bundle-check/run.mjs:65 marker `.vpg-button-group {`, Skeleton.stylesheet comment (no code). No other
  component, no react-charts use. `grep -rl ButtonGroup source/` confirms.
- Deletion policy: no ADR. release-notes/react-ui@v0.1.0.md:65 "pre-1.0 a breaking change is a minor
  bump"; release SKILL.md:22-23,42 same, notes must name old and new spelling. No deprecation shims
  convention found (grep deprecat in docs/ -> only ADR template status). react-ui is 0.1.1.
- Roving tabindex precedents are all separate: Tabs.tsx:63-92 (DOM query of enabled tabs, modulo wrap,
  Home/End, orientation pair only, no RTL), Tree (flatten model, RTL via computed direction in
  Tree/keyboard.ts:26), Menu (floating-ui useListNavigation, ADR 0030 rejects shared hook "separate decision").
  No shared roving hook exists, so a Toolbar would be the fourth hand-rolled one or the trigger to consolidate.
