---
name: state-shift-sign-flips-with-colour-mode
kind: gotcha
description: "--vpg-state-shift is +0.05 in dark and -0.05 in light, so `l + state-shift` always gains contrast against the surface and `l - state-shift` always loses it; pick a new ramp step's operator by that meaning."
anchors:
  - path: source/react-ui/packages/tokens/src/base-stylesheet.ts
    blob: efc73d4c829f
  - path: source/react-ui/packages/tokens/src/theme.ts
    blob: 3675e69c484c
confidence: verified
---

`--vpg-state-shift` is `0.05` in the dark declarations (`base-stylesheet.ts:16`) and `-0.05` in
the light arm (`base-stylesheet.ts:79`). Hover/press use `l + state-shift` (`theme.ts:202-203`),
which moves away from the surface in both modes; wash uses `l - state-shift * 6.5`
(`theme.ts:204`), which deliberately moves toward the surface.

A new ramp step must choose its operator by that meaning, not by copying whichever sign looks
right in the mode being eyeballed. `--vpg-accent-visited` initially copied wash's `l - ...` and
looked plausible in one mode while losing contrast in the other; it is now `l + state-shift * 3`
(`theme.ts:215`, rationale comment at `theme.ts:209-214`; the danger, success and warning visited
steps repeat it at `:226`, `:236`, `:243`). Rule text:
`source/react-ui/packages/tokens/.agents/rules/state-ramp-shift-direction.md`.
