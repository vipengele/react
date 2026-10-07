import type { VirtualElement } from "@floating-ui/react";
import { type KeyboardEvent, type MouseEvent, type PointerEvent, useCallback, useEffect, useRef } from "react";

/** How long a touch has to rest on the target before it opens the menu, in milliseconds. */
export const DEFAULT_LONG_PRESS_DELAY = 500;

/** How far a resting touch may drift before it reads as a scroll or a drag instead of a long
 * press, in pixels. */
const LONG_PRESS_TOLERANCE = 10;

/** A touch press claimed by the innermost target wrapping it. A pointer event carries no
 * `defaultPrevented` a long press could use without also cancelling the browser's own handling
 * of the touch, so a nested target marks the press here instead, and every enclosing target
 * leaves it alone. */
const claimedPresses = new WeakSet<Event>();

export interface UseContextMenuTriggersOptions {
  /** While set, no gesture opens the menu and the browser's own menu shows instead. Flipping it
   * on cancels a long press already under way. */
  disabled: boolean;
  /** How long a touch has to rest before it opens the menu, in milliseconds. */
  longPressDelay: number;
  /** Opens the menu at `anchor`, or moves an open one there. */
  onInvoke: (anchor: VirtualElement, event: Event) => void;
}

export interface ContextMenuTriggerProps {
  onContextMenu: (event: MouseEvent<HTMLElement>) => void;
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
  onPointerDown: (event: PointerEvent<HTMLElement>) => void;
  onPointerMove: (event: PointerEvent<HTMLElement>) => void;
  onPointerUp: () => void;
  onPointerCancel: () => void;
  onClickCapture: (event: MouseEvent<HTMLElement>) => void;
}

interface PendingPress {
  x: number;
  y: number;
  timer: ReturnType<typeof setTimeout>;
  /** Removes the scroll listener that cancels the press. */
  stopListening: () => void;
}

/** A zero-size reference at a viewport point, so the panel opens with its corner under the
 * pointer. */
function pointAnchor(x: number, y: number, contextElement: Element): VirtualElement {
  return {
    getBoundingClientRect: () => ({ x, y, width: 0, height: 0, top: y, left: x, right: x, bottom: y }),
    contextElement,
  };
}

/** A reference following `element`'s box, so the panel opens below the element holding focus. */
export function elementAnchor(element: Element): VirtualElement {
  return { getBoundingClientRect: () => element.getBoundingClientRect(), contextElement: element };
}

/**
 * The gestures that open a context menu, as handlers for the element wrapping its target: a
 * secondary click (the native `contextmenu` event), a touch held still for `longPressDelay`, and
 * `Shift+F10` or the `ContextMenu` key.
 *
 * An event that does not start inside the wrapper's own DOM subtree is ignored: React bubbles an
 * event from a portalled overlay through the component tree, so an overlay opened from inside
 * the target — this menu's own nested ones included — would otherwise invoke the menu from its
 * own panel.
 *
 * The innermost target wins. A handled `contextmenu` or key press is `preventDefault`ed, and a
 * target finding an event already prevented leaves it alone; nothing stops propagation, so an
 * enclosing handler that is not a context menu still sees the event.
 *
 * One gesture opens the menu once. A browser that follows a long press with its own
 * `contextmenu` (Android) and a trailing `click`, or a context-menu key press with its own
 * `contextmenu` (Windows), would otherwise open the menu a second time and activate whatever
 * sits under the finger: the follow-up `contextmenu` and `click` after a gesture are swallowed,
 * until the next press or key starts a new one.
 */
export function useContextMenuTriggers({ disabled, longPressDelay, onInvoke }: UseContextMenuTriggersOptions): ContextMenuTriggerProps {
  const pressRef = useRef<PendingPress | null>(null);
  // The follow-ups of a gesture that has already opened the menu, still to be swallowed.
  const swallowRef = useRef({ contextMenu: false, click: false });

  const onInvokeRef = useRef(onInvoke);
  useEffect(() => {
    onInvokeRef.current = onInvoke;
  });

  const cancelPress = useCallback(() => {
    const press = pressRef.current;
    if (press === null) {
      return;
    }
    pressRef.current = null;
    clearTimeout(press.timer);
    press.stopListening();
  }, []);

  useEffect(() => {
    if (disabled) {
      cancelPress();
    }
  }, [disabled, cancelPress]);

  // A press still timing when the target unmounts would open a menu that no longer exists.
  useEffect(() => cancelPress, [cancelPress]);

  /** Whether `event` started inside the wrapper's own DOM subtree rather than in an overlay
   * React bubbled it up from. */
  const isOwn = (event: { currentTarget: Element; target: EventTarget }) => event.currentTarget.contains(event.target as Node);

  return {
    onContextMenu(event) {
      if (disabled || event.defaultPrevented || !isOwn(event)) {
        return;
      }
      event.preventDefault();
      if (swallowRef.current.contextMenu) {
        swallowRef.current.contextMenu = false;
        return;
      }
      // Android's own `contextmenu` can land before the long-press timer does. It is the same
      // gesture: the timer stands down, and the click the lifted finger makes is still swallowed.
      if (pressRef.current !== null) {
        cancelPress();
        swallowRef.current.click = true;
      }
      // A `contextmenu` raised from the keyboard (`Shift+F10`, the `ContextMenu` key) carries no
      // pointer position: the browser reports it at `clientX === 0 && clientY === 0`, and the
      // menu then anchors to the focused element the event targets. A real pointer at the very
      // corner of the viewport reads as a keyboard invocation; the menu then opens against the
      // element under the pointer, which is still where the user is looking.
      const anchor =
        event.clientX === 0 && event.clientY === 0
          ? elementAnchor(event.target as Element)
          : pointAnchor(event.clientX, event.clientY, event.currentTarget);
      onInvokeRef.current(anchor, event.nativeEvent);
    },

    onKeyDown(event) {
      swallowRef.current = { contextMenu: false, click: false };
      const isMenuKey = event.key === "ContextMenu" || (event.key === "F10" && event.shiftKey);
      if (!isMenuKey || disabled || event.defaultPrevented || !isOwn(event)) {
        return;
      }
      // macOS raises no `contextmenu` for either key, so the key itself opens the menu. Where the
      // browser does raise one, it follows this keydown and is swallowed.
      event.preventDefault();
      swallowRef.current.contextMenu = true;
      onInvokeRef.current(elementAnchor(event.target as Element), event.nativeEvent);
    },

    onPointerDown(event) {
      swallowRef.current = { contextMenu: false, click: false };
      cancelPress();
      // A mouse or pen has a secondary button, which raises `contextmenu`; only a touch needs
      // holding still to stand in for one.
      if (disabled || event.pointerType !== "touch" || claimedPresses.has(event.nativeEvent) || !isOwn(event)) {
        return;
      }
      claimedPresses.add(event.nativeEvent);
      const { clientX: x, clientY: y, currentTarget, nativeEvent } = event;
      // A scroll anywhere moves the content out from under a resting finger. Scroll events do not
      // bubble, so the listener captures on the document to see every scroller's.
      const document = currentTarget.ownerDocument;
      document.addEventListener("scroll", cancelPress, { capture: true, passive: true });
      pressRef.current = {
        x,
        y,
        stopListening: () => document.removeEventListener("scroll", cancelPress, { capture: true }),
        timer: setTimeout(() => {
          cancelPress();
          swallowRef.current = { contextMenu: true, click: true };
          onInvokeRef.current(pointAnchor(x, y, currentTarget), nativeEvent);
        }, longPressDelay),
      };
    },

    onPointerMove(event) {
      const press = pressRef.current;
      if (press !== null && Math.hypot(event.clientX - press.x, event.clientY - press.y) > LONG_PRESS_TOLERANCE) {
        cancelPress();
      }
    },

    onPointerUp: cancelPress,

    onPointerCancel: cancelPress,

    onClickCapture(event) {
      if (swallowRef.current.click) {
        swallowRef.current.click = false;
        // Stopped as well as prevented: the click is the finger lifting off a long press, not an
        // activation, and a button inside the target must not run its handler for it.
        event.preventDefault();
        event.stopPropagation();
      }
    },
  };
}
