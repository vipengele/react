/**
 * `<Inline>`'s own styles, injected as an inline `<style>` rather than a `.css` import so the
 * package can stay `"sideEffects": false`.
 *
 * Every per-instance value arrives as a component-scoped `--vpg-inline-*` property the component
 * sets inline on its own element, so one static rule serves every inline on the page whatever its
 * gap, alignment and wrapping (ADR-0019). The component always sets all four, so each is read
 * bare with no fallback standing in for an unset prop (ADR-0009).
 */
export const inlineStylesheet = `
.vpg-inline {
  display: flex;
  flex-direction: row;
  flex-wrap: var(--vpg-inline-wrap);
  gap: var(--vpg-inline-gap);
  align-items: var(--vpg-inline-align);
  justify-content: var(--vpg-inline-justify);
}
`;
