import { type ReactNode, useCallback } from "react";
import { createPortal } from "react-dom";

/** The attribute a modal surface carries to make itself the portal target of every overlay opened
 * from inside it. */
export const OVERLAY_ROOT_ATTRIBUTE = "data-vpg-overlay-root";

export interface UseOverlayRootReturn {
  /** The element an overlay opened from the reference portals into, or `null` when it renders
   * inline beside its trigger. */
  root: Element | null;
  /** Portals `node` into `root`, or returns it unchanged to render inline when `root` is `null`. */
  portal: (node: ReactNode) => ReactNode;
}

/**
 * Resolves where an overlay opened from `reference` renders, and is the one place an overlay
 * calls `createPortal`.
 *
 * The target is the nearest ancestor carrying `data-vpg-overlay-root`, else the nearest
 * `.vpg-root`, else none. The overlay root wins even over a nearer `.vpg-root`: a modal surface
 * makes everything outside itself inert and paints above it, so an overlay portaled out of it
 * is unreachable and hidden, while a `ThemeProvider` nested inside the surface only loses its
 * theme for that overlay. Without either ancestor — an unthemed page, or a test rendering the
 * component on its own — the overlay renders inline, never into `document.body`, which sits
 * outside the subtree `ThemeProvider` assigns its `--vpg-*` properties on.
 */
export function useOverlayRoot(reference: Element | null): UseOverlayRootReturn {
  const root = reference?.closest(`[${OVERLAY_ROOT_ATTRIBUTE}]`) ?? reference?.closest(".vpg-root") ?? null;
  const portal = useCallback((node: ReactNode) => (root === null ? node : createPortal(node, root)), [root]);
  return { root, portal };
}
