/**
 * `<Stack>`'s own styles, injected as an inline `<style>` rather than a `.css` import so the
 * package can stay `"sideEffects": false`.
 *
 * Every per-instance value arrives as a component-scoped `--vpg-stack-*` property the component
 * sets inline on its own element, so one static rule serves every stack on the page whatever its
 * gap and alignment (ADR-0019). The component always sets all three, so each is read bare with
 * no fallback standing in for an unset prop (ADR-0009).
 */
export const stackStylesheet = `
.vpg-stack {
  display: flex;
  flex-direction: column;
  gap: var(--vpg-stack-gap);
  align-items: var(--vpg-stack-align);
  justify-content: var(--vpg-stack-justify);
}
`;
