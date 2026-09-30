---
about: --vpg-state-shift's sign flips with colour mode specifically so that l + state-shift always moves a ramp step away from the surface (more contrast) and l - state-shift always moves it toward the surface (less contrast, e.g. wash); a new ramp step must pick its operator by that meaning, not by copying whichever sign looks right in the mode being eyeballed
saw:
  - source/react-ui/packages/tokens/src/base-stylesheet.ts
  - source/react-ui/packages/tokens/src/theme.ts
  - source/react-ui/packages/tokens/src/theme.test.ts
  - source/react-ui/packages/tokens/.agents/rules/state-ramp-shift-direction.md
---

`--vpg-state-shift` is `-0.05` in the light base rule and `0.05` under the dark override
(`base-stylesheet.ts`). `--vpg-accent-hover`/`-press` read `l + state-shift`; the comment beside
them in `theme.ts` says this is deliberate — "a hover lightens on a dark ground and darkens on a
light one" — and that phrasing describes a step that always gains contrast against the surface,
in both modes, not a step that always shifts the same visual direction.

`--vpg-accent-wash` reads `l - state-shift` (the opposite operator): it's a background tint, so
it deliberately moves toward the surface instead, appropriately fainter in whichever mode.

When `--vpg-accent-visited`/`--vpg-danger-visited` were added, they copied wash's operator
(`l - state-shift * 3`) reasoning only "visited should differ from hover," not "visited needs to
gain contrast like hover, not lose it like wash." That produced a token that looked fine in
whichever mode it was eyeballed in (checked here in light mode, where it happened to render
plausibly) while dropping accent-link contrast against white from ~4.4:1 to ~2.6:1 — confirmed
by rendering both states in a real (non-isolated-context) Chromium tab and sampling the painted
pixels, since `getComputedStyle` always returns the unvisited colour for privacy and can't be
used to check this. A panel-code-review pass caught it; no test would have, because the only
`-visited` assertion at the time checked danger mirrors accent, which passes with either sign.

The fix (`l + state-shift * 3`) and a test pinning the exact derived string, not just that it
differs from hover, are on this branch. `state-ramp-shift-direction.md` documents the rule for
future ramp additions.
