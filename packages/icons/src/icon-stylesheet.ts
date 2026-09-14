/**
 * Default sizing/stroke for `<Icon>` when a caller doesn't pass `size`/`strokeWidth`, injected
 * as an inline `<style>` rather than a `.css` import so the package can stay
 * `"sideEffects": false` (same approach as `@tandiko/tokens`'s base stylesheet).
 *
 * `@tandiko/tokens` doesn't yet define `--tandiko-icon-size-md`/`--tandiko-icon-stroke-md` — the
 * fallback values below keep this class useful standalone until a later slice adds them.
 */
export const iconStylesheet = `
.tandiko-icon-size-default {
  width: var(--tandiko-icon-size-md, 1.25rem);
  height: var(--tandiko-icon-size-md, 1.25rem);
}

.tandiko-icon-stroke-default {
  stroke-width: var(--tandiko-icon-stroke-md, 2);
}
`;
