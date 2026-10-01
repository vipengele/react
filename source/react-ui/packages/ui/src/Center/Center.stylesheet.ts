/**
 * `<Center>`'s own styles, injected as an inline `<style>` rather than a `.css` import so the
 * package can stay `"sideEffects": false`.
 *
 * The cap and the inline padding arrive as the component-scoped `--vpg-center-max` and
 * `--vpg-center-inset` properties the instance writes inline (ADR-0019). The component always
 * writes both, so each is read bare with no fallback standing in for an unset prop (ADR-0009).
 *
 * `border-box` makes the cap the outer width, inset included, so two centres at the same step
 * line up on their outer edges whatever their insets (ADR-0023). `.vpg-center-intrinsic` turns
 * the box into a flex column that centres each child at its own width instead of stretching it to
 * the cap; the box itself stays capped and margin-centred.
 */
export const centerStylesheet = `
.vpg-center {
  box-sizing: border-box;
  max-inline-size: var(--vpg-center-max);
  margin-inline: auto;
  padding-inline: var(--vpg-center-inset);
}

.vpg-center-intrinsic {
  display: flex;
  flex-direction: column;
  align-items: center;
}
`;
