/**
 * The element an overlay anchored to `reference` portals into: the nearest ancestor carrying
 * `data-vpg-overlay-root`, else the nearest `.vpg-root`, else `null`.
 *
 * Only a modal surface carries `data-vpg-overlay-root`. It makes everything outside itself inert
 * and paints above it, so an overlay opened from inside one and portaled anywhere else would be
 * unreachable and hidden. `ThemeProvider` assigns every `--vpg-*` property on `.vpg-root`, so an
 * overlay portaled to `document.body` would resolve every `var()` to nothing — this never returns
 * it. `null` means there is no root to portal into — an unthemed page, or a test rendering the
 * component on its own — and the caller renders the overlay inline beside its trigger instead.
 */
export function useOverlayRoot(reference: Element | null | undefined): Element | null {
  return reference?.closest("[data-vpg-overlay-root]") ?? reference?.closest(".vpg-root") ?? null;
}
