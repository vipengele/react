import { type ReactNode, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { OVERLAY_ROOT_ATTRIBUTE, useOverlayRoot } from "../internal/useOverlayRoot.js";

/** An open modal surface: `Dialog` and a modal `Drawer` carry the overlay-root marker, and
 * `showModal()` sets `open` on the `<dialog>` that holds it. */
const OPEN_MODAL_SURFACE = `[${OVERLAY_ROOT_ATTRIBUTE}][open]`;

/** Moves `surface` to the top of `open`, the open modal surfaces in the order they opened. */
function raise(open: Element[], surface: Element) {
  const index = open.indexOf(surface);
  if (index !== -1) open.splice(index, 1);
  open.push(surface);
}

/**
 * Brings `open` up to date with a batch of mutations, in the order they happened. `open` set on a
 * marked element opens it above every surface already open; a marked element inserted already open
 * joins on top, after any open surface it holds. A surface that closed or left the document is
 * dropped later, by reading its state rather than its records.
 */
function track(open: Element[], records: MutationRecord[]) {
  for (const record of records) {
    if (record.type === "attributes") {
      // The observer filters on `open`, which only an element carries. An `oldValue` of `null`
      // means the attribute was absent until this mutation set it.
      const target = record.target as Element;
      if (record.oldValue === null && target.hasAttribute(OVERLAY_ROOT_ATTRIBUTE)) raise(open, target);
      continue;
    }
    for (const node of record.addedNodes) {
      if (node.nodeType !== Node.ELEMENT_NODE) continue;
      const element = node as Element;
      for (const surface of [element, ...element.querySelectorAll(OPEN_MODAL_SURFACE)]) {
        if (surface.matches(OPEN_MODAL_SURFACE) && !open.includes(surface)) open.push(surface);
      }
    }
  }
}

/** A parent node, with the DOM's `moveBefore` where the engine implements it. */
type MoveParent = ParentNode & Node & { moveBefore?: (node: Node, child: Node | null) => void };

/**
 * Puts `element` into `parent` before `before`. Between two places in the document `moveBefore`
 * moves it as one step: a shown popover inside stays shown and its descendants keep their computed
 * style, where removing and inserting it hides the popover and replays every toast's entry
 * transition. A host that has left the document with an unmounted surface, or an engine without
 * `moveBefore`, takes the plain insert.
 */
function move(element: Element, parent: MoveParent, before: Node | null) {
  if (typeof parent.moveBefore === "function" && element.isConnected && parent.isConnected) parent.moveBefore(element, before);
  else parent.insertBefore(element, before);
}

/** Drops from `open` every surface that has closed or left the document since it opened. */
function prune(open: Element[]) {
  for (let index = open.length - 1; index >= 0; index -= 1) {
    const surface = open[index] as Element;
    if (!surface.isConnected || !surface.matches(OPEN_MODAL_SURFACE)) open.splice(index, 1);
  }
}

/**
 * Owns the element a popover and its announcer render into, and keeps it where both are reachable.
 * The returned function portals into that host element, and renders nothing until the host exists,
 * which is never on the server.
 *
 * A modal surface makes everything outside its own subtree inert, a popover painted above it
 * included: an inert toast is drawn but cannot be focused or clicked, and is absent from the
 * accessibility tree, so neither it nor a live region beside it is ever read. While a modal surface
 * is open the host element is therefore appended to the topmost one, the one opened last; while
 * none is, it sits in the overlay root `sentinel` resolves through `useOverlayRoot`, else directly
 * after `sentinel`. It moves as modal surfaces open, close and leave the document, the last
 * covering a surface unmounted with the host still inside it.
 *
 * The host is created here and never rendered by React, so moving it is a DOM move and nothing
 * more: whatever is portaled into it keeps its React state and its nodes. It is `display:
 * contents`, so it adds no box to the surface it sits in.
 *
 * Top-layer elements paint in the order they were shown, so after every move `popover` is hidden
 * and shown again in one step: shown last, it paints above the surface it has just moved into.
 * The popover is shown when it mounts and hidden when it unmounts.
 *
 * The open order of surfaces already open when the hook mounts cannot be read from the DOM, so they
 * are taken in document order, which is their open order when each was opened from inside the one
 * around it. Surfaces opened afterwards are ordered by the mutations that opened them.
 *
 * An engine without `MutationObserver` places the host once and leaves it there; an engine without
 * the Popover API leaves the popover where the page lays it out.
 */
export function useModalSurfaceHost(sentinel: Element | null, popover: HTMLElement | null): (node: ReactNode) => ReactNode {
  const { root } = useOverlayRoot(sentinel);
  const [host, setHost] = useState<HTMLDivElement | null>(null);
  // Outlives each run of the placing effect below, which re-runs whenever its inputs change but
  // sees the mutations of only the one run.
  const open = useRef<Element[] | null>(null);

  useEffect(() => {
    const element = document.createElement("div");
    element.className = "vpg-toast-host";
    setHost(element);
    return () => element.remove();
  }, []);

  useLayoutEffect(() => {
    if (sentinel === null || host === null) return;
    open.current ??= [...document.querySelectorAll(OPEN_MODAL_SURFACE)];
    const surfaces = open.current;

    function place(element: HTMLDivElement, anchor: Element) {
      prune(surfaces);
      const target = surfaces.at(-1) ?? root;
      if (target === null ? element.previousSibling === anchor : element.parentNode === target) return;
      if (target === null) move(element, anchor.parentNode as MoveParent, anchor.nextSibling);
      else move(element, target, null);
      if (popover === null || typeof popover.showPopover !== "function") return;
      popover.hidePopover();
      popover.showPopover();
    }

    place(host, sentinel);
    if (typeof MutationObserver === "undefined") return;
    const observer = new MutationObserver((records) => {
      track(surfaces, records);
      place(host, sentinel);
    });
    observer.observe(document, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["open"],
      attributeOldValue: true,
    });
    return () => {
      // Records still queued would otherwise be lost to the next run.
      track(surfaces, observer.takeRecords());
      observer.disconnect();
    };
  }, [sentinel, host, root, popover]);

  useEffect(() => {
    if (popover === null || typeof popover.showPopover !== "function") return;
    popover.showPopover();
    return () => popover.hidePopover();
  }, [popover]);

  return (node) => (host === null ? null : createPortal(node, host));
}
