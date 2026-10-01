/**
 * `<AspectRatio>`'s own styles, injected as an inline `<style>` rather than a `.css` import so the
 * package can stay `"sideEffects": false`.
 *
 * The ratio arrives as the component-scoped `--vpg-aspect-ratio-ratio` property the component sets
 * inline on its own element, so one static rule serves every box on the page whatever its ratio
 * (ADR-0019). The component always sets it to a positive number, so it is read bare with no
 * fallback standing in for an unset prop (ADR-0009).
 *
 * `overflow: hidden` makes the box a scroll container, which zeroes its automatic minimum size,
 * so tall content cannot grow the box past the ratio. `overflow: clip` does not create a scroll
 * container and restores the content-based minimum, letting a tall child stretch the box.
 *
 * Every direct child fills the box, and an `img` or `video` child covers it without distortion.
 */
export const aspectRatioStylesheet = `
.vpg-aspect-ratio {
  aspect-ratio: var(--vpg-aspect-ratio-ratio);
  overflow: hidden;
}

.vpg-aspect-ratio > * {
  width: 100%;
  height: 100%;
}

.vpg-aspect-ratio > :is(img, video) {
  object-fit: cover;
}
`;
