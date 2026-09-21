/**
 * `<StatePanel>`'s own styles, injected as an inline `<style>` rather than a `.css` import so
 * the package can stay `"sideEffects": false` (same approach as `Typography`'s stylesheet).
 *
 * Every `--vpg-*` property is *read* here through `var()` and never assigned inline by the
 * component: an inline declaration would shadow the dark-mode reassignment in
 * `@vipengele/react-tokens`'s base stylesheet. The media slot does not size its content; the
 * caller's node owns its own dimensions.
 */
export const statePanelStylesheet = `
.vpg-state-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--vpg-space-4);
  text-align: center;
}

.vpg-state-panel-text {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--vpg-space-2);
}

.vpg-state-panel-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--vpg-space-2);
}

/* The default illustrations. 9rem is the width of the drawing itself, not a step of any family:
   every size step stops at 3rem, which is a control's height, and a picture is not a control.
   An auto height lets the viewBox's own ratio set the rest. */
.vpg-state-panel-art {
  width: 9rem;
  height: auto;
}

/* Five faces, each a lightness and chroma step off --vpg-accent-wash, so the whole drawing is
   one seed-derived family rather than five colours to keep in agreement. The wash is the top of
   the ramp and every other face steps down from it, which is the one direction that works in
   both colour modes: the wash sits below the surface's lightness in light mode and below it
   again in dark, so a face darker than the wash separates from the page either way. Chroma
   climbs as lightness falls, which is what keeps the darkest faces reading as a tint of the
   seed rather than as grey. */
.vpg-state-panel-art-ground {
  fill: oklch(from var(--vpg-accent-wash) l calc(c * 0.57) h);
}

.vpg-state-panel-art-flap {
  fill: oklch(from var(--vpg-accent-wash) calc(l - 0.021) calc(c * 0.66) h);
}

.vpg-state-panel-art-wall {
  fill: oklch(from var(--vpg-accent-wash) calc(l - 0.069) calc(c * 0.86) h);
}

.vpg-state-panel-art-wall-shaded {
  fill: oklch(from var(--vpg-accent-wash) calc(l - 0.105) calc(c * 1.05) h);
}

.vpg-state-panel-art-inside {
  fill: oklch(from var(--vpg-accent-wash) calc(l - 0.226) calc(c * 1.3) h);
}

/* The rays are the one part drawn in the accent itself, so the drawing has a focal point at
   the seed's full chroma. They are stroked, not filled: a round cap is what gives each ray its
   shape. */
.vpg-state-panel-art-ray {
  fill: none;
  stroke: var(--vpg-accent);
  stroke-width: 8;
  stroke-linecap: round;
}

/* The warning triangle is solid accent, the one shape in its drawing at the seed's full chroma.
   Its corners are rounded by stroking the triangle through the three corner centres in the fill
   colour: the round join draws each corner arc, so body and radius are one path rather than
   three arcs and three lines to keep in agreement. */
.vpg-state-panel-art-alert {
  fill: var(--vpg-accent);
  stroke: var(--vpg-accent);
  stroke-width: 24;
  stroke-linejoin: round;
}

/* The exclamation mark sits on the accent, so it takes the colour the theme guarantees reads
   against the accent rather than a white that a light seed would lose. */
.vpg-state-panel-art-mark {
  fill: var(--vpg-accent-contrast);
}

/* The sparks are stroked, not filled: a round cap is what gives each one its shape. */
.vpg-state-panel-art-spark {
  fill: none;
  stroke: var(--vpg-accent);
  stroke-width: 6;
  stroke-linecap: round;
}

/* The lens glass is the palest face of the same ramp — the wash's lightness at a chroma below the
   blob's, so the disc reads as glass laid over the blob rather than as a second blob. */
.vpg-state-panel-art-lens {
  fill: oklch(from var(--vpg-accent-wash) l calc(c * 0.34) h);
}

/* The magnifier's ring and handle are the one part of the drawing in ink rather than in the
   accent-wash ramp. Ink is the only family that inverts with the colour mode, so both hold their
   weight against the blob in light and in dark; a wash step only ever moves darker, which on a
   dark ground puts a dark ring on a dark blob. The handle takes the heavier of the two inks, which
   is what separates it from the ring where the two meet. Both are stroked with a round cap, so the
   ring is one circle and the handle one segment. */
.vpg-state-panel-art-lens-ring {
  fill: none;
  stroke: var(--vpg-ink-subtle);
  stroke-width: 16.3;
}

.vpg-state-panel-art-lens-handle {
  fill: none;
  stroke: var(--vpg-ink-muted);
  stroke-width: 25;
  stroke-linecap: round;
}

/* The shine inside the ring is a step down the ramp, not up: the glass is already at the wash's
   lightness, so the only direction left for a mark on it is darker. It sits between the flap and
   the wall on the same ladder. */
.vpg-state-panel-art-lens-shine {
  fill: none;
  stroke: oklch(from var(--vpg-accent-wash) calc(l - 0.045) calc(c * 0.76) h);
  stroke-width: 7.5;
  stroke-linecap: round;
}
`;
