/**
 * Default sizing/stroke for `<Icon>` when a caller doesn't pass `size`/`strokeWidth`, injected
 * as an inline `<style>` rather than a `.css` import so the package can stay
 * `"sideEffects": false` (same approach as `@vipengele/react-tokens`'s base stylesheet).
 *
 * `@vipengele/react-tokens` doesn't yet define `--vpg-icon-size-md`/`--vpg-icon-stroke-md` — the
 * fallback values below keep this class useful standalone until a later slice adds them.
 */
export const iconStylesheet = `
.vpg-icon-size-default {
  width: var(--vpg-icon-size-md, 1.25rem);
  height: var(--vpg-icon-size-md, 1.25rem);
}

.vpg-icon-stroke-default {
  stroke-width: var(--vpg-icon-stroke-md, 2);
}
`;
