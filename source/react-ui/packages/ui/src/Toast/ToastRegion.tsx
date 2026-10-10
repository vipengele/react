import { AlertCircle, Check, type IconComponent, Info, X } from "@vipengele/react-icons";
import { type FocusEvent, type KeyboardEvent, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { toastStylesheet } from "./Toast.stylesheet.js";
import { getDefaultToaster, type ToastData, type Toaster, type ToastTone } from "./toaster.js";
import { useModalSurfaceHost } from "./useModalSurfaceHost.js";

/** Where on the viewport a region stacks its toasts. `start` and `end` follow the writing
 * direction: `bottom-end` is the bottom-left corner in a right-to-left document. */
export type ToastPlacement = "top-start" | "top-center" | "top-end" | "bottom-start" | "bottom-center" | "bottom-end";

export interface ToastRegionProps {
  /** The toaster whose toasts the region renders. Defaults to the package's default toaster, the
   * one the exported `toast` raises into. */
  toaster?: Toaster;
  /** The corner or edge the toasts stack against. The newest toast sits nearest that edge. */
  placement?: ToastPlacement;
  /**
   * The key that moves focus to the region from anywhere in the document, named in the region's
   * accessible name so a screen reader user hears how to reach it. A key name, optionally preceded
   * by `+`-joined modifier names (`Alt`, `Ctrl` or `Control`, `Meta`, `Shift`): `F8`, `Alt+T`,
   * `Control+Shift+K`. The modifiers held must be exactly the ones named, so `Shift+F8` does not
   * press `F8`. The key matches `event.key` in any case, and a single letter also matches its
   * physical key, because a held modifier can change the character a key types (`Alt+T` types `†`
   * on a macOS layout). A hotkey naming any other modifier matches nothing.
   */
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

/** The event flag each modifier name a hotkey may carry reads. */
const modifierFlags: Record<string, "altKey" | "ctrlKey" | "metaKey" | "shiftKey"> = {
  Alt: "altKey",
  Control: "ctrlKey",
  Ctrl: "ctrlKey",
  Meta: "metaKey",
  Shift: "shiftKey",
};

/** Whether `event` presses `hotkey`, read as `ToastRegionProps.hotkey` describes. */
function matchesHotkey(event: globalThis.KeyboardEvent, hotkey: string): boolean {
  const parts = hotkey.split("+");
  const key = parts.pop() as string;
  const flags = parts.map((part) => (Object.hasOwn(modifierFlags, part) ? modifierFlags[part] : undefined));
  if (flags.includes(undefined)) return false;
  for (const flag of ["altKey", "ctrlKey", "metaKey", "shiftKey"] as const) {
    if (event[flag] !== flags.includes(flag)) return false;
  }
  if (event.key.toLowerCase() === key.toLowerCase()) return true;
  return /^[a-z]$/i.test(key) && event.code === `Key${key.toUpperCase()}`;
}

/**
 * Renders one toaster's toasts. Mount one region, once, under a `ThemeProvider` and above
 * whatever raises toasts: a toast raised while its toaster has no region is dropped.
 *
 * The region is a `popover="manual"` element shown with `showPopover()`, so it sits in the top
 * layer without being modal. It and its announcer render into one host element the region owns.
 * While no modal surface is open the host sits in the overlay root `useOverlayRoot` resolves from a
 * hidden inline sentinel: the nearest modal surface around it, else the nearest `.vpg-root`, else
 * inline where the region is declared. A modal surface makes everything outside its own subtree
 * inert, a popover painted above it included, so while one is open the host moves into the topmost
 * open modal surface, and the popover is hidden and shown again to paint above it: a toast raised
 * from inside an open dialog is seen, reached, operated and announced. Moving the host remounts
 * nothing, so the toasts keep their state and the toaster's timers run on. Inside the popover a
 * labelled `region` holds an ordered list of the visible toasts.
 *
 * The one live region is a visually hidden announcer beside the popover, outside it. It holds the
 * text of each visible toast, so a toast is announced when it becomes visible and again only when
 * its text changes; hiding and showing the popover touches nothing the announcer holds.
 *
 * While the pointer is over the region or focus is inside it, the toaster's timers are paused.
 *
 * Pressing `hotkey` anywhere in the document focuses the region, with or without toasts in it, so
 * a screen reader user learns where notifications appear before the first one does. The region is
 * focusable only that way (`tabIndex={-1}`), never a tab stop. Every mounted region listens, and
 * the one first in document order among those whose hotkey was pressed acts for all of them: it
 * focuses each such region in document order until one takes focus. Document order is read at
 * the keypress, wherever the hosts sit then, and a region that a modal `<dialog>` it is not inside
 * makes inert refuses focus and is passed over for the next.
 *
 * `Escape` pressed inside the region goes no further: its propagation is stopped, so a `document`
 * listener such as the one that closes the innermost open overlay never hears it, and its default
 * is prevented, so a modal `<dialog>` the region sits in raises no `cancel`. Focus returns to the
 * element it came from when it entered the region, if that is still in the document and can take
 * it; otherwise it leaves the region for the document body. No toast is dismissed.
 */
export function ToastRegion({ toaster, placement = "bottom-end", hotkey = "F8" }: ToastRegionProps) {
  const { store, toast } = toaster ?? getDefaultToaster();
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
  // The region has no trigger to resolve its portal target from, so this inline sentinel stands in
  // for one. The host is placed from it before the popover is first shown, so the popover is never
  // shown in the wrong place.
  const [sentinel, setSentinel] = useState<HTMLSpanElement | null>(null);
  const [popover, setPopover] = useState<HTMLDivElement | null>(null);
  const portal = useModalSurfaceHost(sentinel, popover);
  const regionRef = useRef<HTMLElement>(null);
  const hovered = useRef(false);
  const focused = useRef(false);
  // The element focus came from when it last entered the region, while it is inside it.
  const cameFrom = useRef<HTMLElement | null>(null);

  useEffect(() => store.registerRegion(), [store]);

  useEffect(() => {
    function handleHotkey(event: globalThis.KeyboardEvent) {
      if (!matchesHotkey(event, hotkey)) return;
      const pressed = [...document.querySelectorAll<HTMLElement>(".vpg-toast-viewport")].filter((element) =>
        matchesHotkey(event, element.dataset.vpgHotkey as string),
      );
      if (pressed[0] !== regionRef.current) return;
      for (const element of pressed) {
        element.focus();
        if (document.activeElement === element) return;
      }
    }
    document.addEventListener("keydown", handleHotkey);
    return () => document.removeEventListener("keydown", handleHotkey);
  }, [hotkey]);

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

  function handleFocus(event: FocusEvent<HTMLElement>) {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      cameFrom.current = event.relatedTarget instanceof HTMLElement ? event.relatedTarget : null;
    }
    focused.current = true;
    syncPause();
  }

  function handleBlur(event: FocusEvent<HTMLElement>) {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
    cameFrom.current = null;
    focused.current = false;
    syncPause();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key !== "Escape") return;
    // Without this, `useDismiss`'s `document` listener closes the innermost open overlay.
    event.stopPropagation();
    // Without this, a modal `<dialog>` the host has moved into raises `cancel`. With the region
    // declared outside the dialog, the keydown passes through the dialog in the DOM but not
    // through its handlers in the React tree, so `Dialog` reads that `cancel` as a close request.
    event.preventDefault();
    const region = event.currentTarget;
    if (cameFrom.current?.isConnected) cameFrom.current.focus();
    if (region.contains(document.activeElement)) (document.activeElement as HTMLElement).blur();
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
      {portal(
        <>
          {/*
            `aria-atomic="false"` makes a screen reader read only the toast just added or changed,
            never every visible toast again.
          */}
          <div className="vpg-toast-announcer" aria-live="polite" aria-atomic="false">
            {snapshot.visible.map((data) => (
              <div key={data.id}>{data.description === undefined ? data.message : `${data.message} ${data.description}`}</div>
            ))}
          </div>
          <div ref={setPopover} popover="manual" className="vpg-toast-region" data-placement={placement}>
            <section
              ref={regionRef}
              aria-label={label}
              className="vpg-toast-viewport"
              data-vpg-hotkey={hotkey}
              tabIndex={-1}
              onKeyDown={handleKeyDown}
              onPointerEnter={() => {
                hovered.current = true;
                syncPause();
              }}
              onPointerLeave={() => {
                hovered.current = false;
                syncPause();
              }}
              onFocus={handleFocus}
              onBlur={handleBlur}
            >
              <ol className="vpg-toast-list">
                {ordered.map((data) => (
                  <ToastItem key={data.id} data={data} onDismiss={toast.dismiss} />
                ))}
              </ol>
            </section>
          </div>
        </>,
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
