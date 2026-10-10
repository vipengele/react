import { useEffect } from "react";
import { OVERLAY_ROOT_ATTRIBUTE } from "../internal/useOverlayRoot.js";

/** An open modal surface: `Dialog` and a modal `Drawer` carry the overlay-root marker, and
 * `showModal()` sets `open` on the `<dialog>` that holds it. */
const OPEN_MODAL_SURFACE = `[${OVERLAY_ROOT_ATTRIBUTE}][open]`;

/** Whether a mutation opened a modal surface: `open` set on a marked element, or a marked element
 * inserted already open, on its own or inside an inserted subtree. */
function opensModalSurface(record: MutationRecord): boolean {
  if (record.type === "attributes") {
    // The observer filters on `open`, which only an element carries.
    return (record.target as Element).matches(OPEN_MODAL_SURFACE);
  }
  return [...record.addedNodes].some(
    (node) =>
      node.nodeType === Node.ELEMENT_NODE &&
      ((node as Element).matches(OPEN_MODAL_SURFACE) || (node as Element).querySelector(OPEN_MODAL_SURFACE) !== null),
  );
}

/**
 * Keeps a shown `popover` above every modal surface opened after it. Top-layer elements paint in
 * the order they were shown, so a `<dialog>` opened with `showModal()` paints over a popover shown
 * before it; whenever a modal surface opens anywhere in the document, the popover is hidden and
 * shown again, which moves it to the top of the top layer. A modal surface already open when the
 * popover is first shown needs nothing: showing it puts it above.
 *
 * Re-showing moves the popover in the top layer and nothing else: no node inside it is added,
 * removed or changed.
 *
 * An engine without `MutationObserver` or the Popover API leaves the popover where it is.
 */
export function useModalReshow(popover: HTMLElement | null): void {
  useEffect(() => {
    if (popover === null || typeof popover.showPopover !== "function" || typeof MutationObserver === "undefined") return;
    const observer = new MutationObserver((records) => {
      if (!records.some(opensModalSurface)) return;
      popover.hidePopover();
      popover.showPopover();
    });
    observer.observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ["open"] });
    return () => observer.disconnect();
  }, [popover]);
}
