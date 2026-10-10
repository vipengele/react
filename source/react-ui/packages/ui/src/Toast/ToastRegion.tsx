import { AlertCircle, Check, type IconComponent, Info, X } from "@vipengele/react-icons";
import { type FocusEvent, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { useOverlayRoot } from "../internal/useOverlayRoot.js";
import { toastStylesheet } from "./Toast.stylesheet.js";
import { getDefaultToaster, type ToastData, type Toaster, type ToastTone } from "./toaster.js";
import { useModalReshow } from "./useModalReshow.js";

/** Where on the viewport a region stacks its toasts. `start` and `end` follow the writing
 * direction: `bottom-end` is the bottom-left corner in a right-to-left document. */
export type ToastPlacement = "top-start" | "top-center" | "top-end" | "bottom-start" | "bottom-center" | "bottom-end";

export interface ToastRegionProps {
  /** The toaster whose toasts the region renders. Defaults to the package's default toaster, the
   * one the exported `toast` raises into. */
  toaster?: Toaster;
  /** The corner or edge the toasts stack against. The newest toast sits nearest that edge. */
  placement?: ToastPlacement;
  /** The key that moves focus to the region, named in the region's accessible name so a screen
   * reader user hears how to reach it. */
  hotkey?: string;
}

/** The glyph drawn beside each status tone's message. A neutral toast draws none. */
const toneIcons: Record<ToastTone, IconComponent | undefined> = {
  neutral: undefined,
  success: Check,
  warning: AlertCircle,
  info: Info,
  danger: AlertCircle,
};

/**
 * Renders one toaster's toasts. Mount one region, once, under a `ThemeProvider` and above
 * whatever raises toasts: a toast raised while its toaster has no region is dropped.
 *
 * The region is a `popover="manual"` element shown with `showPopover()`, so it sits in the top
 * layer without being modal. Whenever a modal surface opens it hides and shows itself again, so it
 * paints above that surface too. It is portaled through `useOverlayRoot` from a hidden inline
 * sentinel: into the nearest modal surface around it, else the nearest `.vpg-root`, else it renders
 * inline where it is declared. Inside the popover a labelled `region` holds an ordered list of the
 * visible toasts.
 *
 * The one live region is a visually hidden announcer beside the sentinel, outside the popover. It
 * holds the text of each visible toast, so a toast is announced when it becomes visible and again
 * only when its text changes; hiding and showing the popover touches nothing the announcer holds.
 *
 * While the pointer is over the region or focus is inside it, the toaster's timers are paused.
 */
export function ToastRegion({ toaster, placement = "bottom-end", hotkey = "F8" }: ToastRegionProps) {
  const { store, toast } = toaster ?? getDefaultToaster();
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
  // The region has no trigger to resolve its portal target from, so this inline sentinel stands in
  // for one. The popover waits for it to mount, so it never renders once in the wrong place.
  const [sentinel, setSentinel] = useState<HTMLSpanElement | null>(null);
  const { portal } = useOverlayRoot(sentinel);
  const [popover, setPopover] = useState<HTMLDivElement | null>(null);
  const regionRef = useRef<HTMLElement>(null);
  const hovered = useRef(false);
  const focused = useRef(false);

  useEffect(() => store.registerRegion(), [store]);

  useEffect(() => {
    // An engine without the Popover API leaves the element where the page lays it out.
    if (popover === null || typeof popover.showPopover !== "function") return;
    popover.showPopover();
    return () => popover.hidePopover();
  }, [popover]);

  useModalReshow(popover);

  // The store's pause is one flag; hover and focus each hold it, and it is released only once
  // neither does.
  function syncPause() {
    if (hovered.current || focused.current) store.pause();
    else store.resume();
  }

  // A toast removed under the pointer or with focus inside it raises no `pointerleave` or
  // `focusout`, so after every change the region drops a hold it can no longer be holding:
  // hover once no toast is left, focus once focus has left the region.
  useLayoutEffect(() => {
    if (snapshot.visible.length === 0) hovered.current = false;
    if (!regionRef.current?.contains(document.activeElement)) focused.current = false;
    syncPause();
  });

  function handleBlur(event: FocusEvent<HTMLElement>) {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
    focused.current = false;
    syncPause();
  }

  const label = `Notifications (${hotkey})`;
  // Document order is reading order: the newest toast sits nearest the edge the region is pinned to.
  const ordered = placement.startsWith("top-") ? [...snapshot.visible].reverse() : snapshot.visible;

  return (
    <>
      {/* React 19 hoists and de-duplicates this by `href`. */}
      <style href="vpg-toast" precedence="vpg-toast">
        {toastStylesheet}
      </style>
      <span hidden ref={setSentinel} />
      {/*
        `aria-atomic="false"` makes a screen reader read only the toast just added or changed,
        never every visible toast again.
      */}
      <div className="vpg-toast-announcer" aria-live="polite" aria-atomic="false">
        {snapshot.visible.map((data) => (
          <div key={data.id}>{data.description === undefined ? data.message : `${data.message} ${data.description}`}</div>
        ))}
      </div>
      {sentinel === null
        ? null
        : portal(
            <div ref={setPopover} popover="manual" className="vpg-toast-region" data-placement={placement}>
              <section
                ref={regionRef}
                aria-label={label}
                className="vpg-toast-viewport"
                onPointerEnter={() => {
                  hovered.current = true;
                  syncPause();
                }}
                onPointerLeave={() => {
                  hovered.current = false;
                  syncPause();
                }}
                onFocus={() => {
                  focused.current = true;
                  syncPause();
                }}
                onBlur={handleBlur}
              >
                <ol className="vpg-toast-list">
                  {ordered.map((data) => (
                    <ToastItem key={data.id} data={data} onDismiss={toast.dismiss} />
                  ))}
                </ol>
              </section>
            </div>,
          )}
    </>
  );
}

function ToastItem({ data, onDismiss }: { data: ToastData; onDismiss: (id: string) => void }) {
  const Glyph = toneIcons[data.tone];
  const { action } = data;
  return (
    <li className={`vpg-toast vpg-toast-${data.tone}`} data-tone={data.tone}>
      {Glyph === undefined ? null : <Glyph className="vpg-toast-icon" aria-hidden="true" />}
      <div className="vpg-toast-content">
        <p className="vpg-toast-message">{data.message}</p>
        {data.description === undefined ? null : <p className="vpg-toast-description">{data.description}</p>}
      </div>
      {action === undefined ? null : (
        <button
          type="button"
          className="vpg-toast-action"
          onClick={() => {
            action.onAction();
            onDismiss(data.id);
          }}
        >
          {action.label}
        </button>
      )}
      <button type="button" className="vpg-toast-dismiss" aria-label="Dismiss notification" onClick={() => onDismiss(data.id)}>
        <X className="vpg-toast-dismiss-icon" aria-hidden="true" />
      </button>
    </li>
  );
}
