---
name: state-shift-sign-flips-with-colour-mode
kind: gotcha
description: "--vpg-state-shift is +0.05 in dark and -0.05 in light, so `l + state-shift` always gains contrast against the surface and `l - state-shift` always loses it; pick a new ramp step's operator by that meaning."
anchors:
  - path: source/react-ui/packages/tokens/src/base-stylesheet.ts
    blob: efc73d4c829f
  - path: source/react-ui/packages/tokens/src/theme.ts
    blob: 14968a2aaad1
confidence: verified
---

`--vpg-state-shift` is `0.05` in the dark declarations (`base-stylesheet.ts:16`) and `-0.05` in
the light arm (`base-stylesheet.ts:79`). Hover/press use `l + state-shift` (`theme.ts:208-209`),
which moves away from the surface in both modes; wash uses `l - state-shift * 6.5`
(`theme.ts:210`), which deliberately moves toward the surface.

A new ramp step must choose its operator by that meaning, not by copying whichever sign looks
right in the mode being eyeballed. `--vpg-accent-visited` initially copied wash's `l - ...` and
looked plausible in one mode while losing contrast in the other; it is now `l + state-shift * 3`
(`theme.ts:221`, rationale comment at `theme.ts:215-220`; the danger, success, warning and info visited
steps repeat it at `:232`, `:242`, `:249`, `:256`). Rule text:
`source/react-ui/packages/tokens/.agents/rules/state-ramp-shift-direction.md`.
