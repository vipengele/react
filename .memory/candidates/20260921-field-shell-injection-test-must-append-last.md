---
about: why a FieldShell injection test only discriminates when the intruder is appended last, and why it cannot assert the control's width is unchanged
saw:
  - source/react-ui/packages/ui/src/FieldShell/FieldShell.browser.test.tsx
  - source/react-ui/packages/ui/src/FieldShell/FieldShell.stylesheet.ts
---

Two ways to write a `FieldShell` injection test that **looks** like it measures the fix and does
not. Both were hit while writing the tests in `FieldShell.browser.test.tsx`
("an element a page injects into the field").

**The intruder must be appended last, after the trailing slot.** Inserting it *before* the
trailing slot produces no observable flip in the `PasswordInput` case: an intruder taking
`flex: 1` there consumes the free space, but the trailing slot ends up flush right either way,
so the reveal button's position is identical with and without the marker. Appending last —
which is what a password-manager extension actually does — is the only placement that makes the
button's position depend on the growth rule at all.

**Do not assert the control's width is unchanged by the injection.** That cannot pass with the
fix in place and is not the behaviour the fix promises: the intruder legitimately keeps its own
width plus one shell `gap`, so the control does shrink by that much. At the default seed the
gap (`--vpg-space-2`) is 8px, so a 24px intruder costs the control 32px. An "unchanged"
assertion fails, gets loosened, and stops detecting anything — the failure mode
`element-box-cannot-detect-own-padding` records for an unrelated `FieldSet` measurement.

The discriminating assertions are instead: the intruder stays at its own set width; the reveal
button's inset from the shell's content right edge stays within `intruder width + columnGap`;
and the `Dropdown` trigger keeps more than half the field. Each was watched go red by removing
the marker from the control under test — without the marker the shell matches the fallback's
`:not(:has(> .vpg-field-shell-control))` guard, so the flip exercises the fallback rule itself
and not merely the tagging.
