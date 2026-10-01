/**
 * `<Separator>`'s own styles, injected as an inline `<style>` rather than a `.css` import so the
 * package can stay `"sideEffects": false`.
 *
 * The line is the element's own border on a zero-size cross axis, so under `border-box` the box
 * is exactly the 1px thickness of the line. The colour is read bare from `--vpg-border`, so the
 * separator follows the theme's colour mode like every other hairline, and because it is a
 * border rather than a background it stays visible in forced-colors (high-contrast) mode, which
 * discards background colours but keeps borders.
 *
 * A vertical separator takes its length from `align-self: stretch`, which only resolves inside a
 * flex or grid container; anywhere else it collapses to zero height, because a separator has no
 * intrinsic length of its own to fall back on.
 */
export const separatorStylesheet = `
.vpg-separator {
  flex: none;
  box-sizing: border-box;
  margin: 0;
  border: 0 solid var(--vpg-border);
}

.vpg-separator-horizontal {
  width: 100%;
  height: 0;
  border-top-width: 1px;
}

.vpg-separator-vertical {
  width: 0;
  align-self: stretch;
  border-left-width: 1px;
}
`;
