import { type MouseEvent, type PointerEvent, useEffect, useLayoutEffect, useRef } from "react";
import type { ToastPlacement } from "./ToastRegion.js";

/** How far, in pixels, a pointer moves in the dismiss direction before a press becomes a swipe.
 * A shorter movement is a click, and leaves the toast where it is. */
export const SWIPE_SLOP = 6;

/** The least distance, in pixels, a swipe released slowly travels to dismiss its toast. */
export const SWIPE_MIN_DISTANCE = 80;

/** The fraction of the toast's size along the swipe axis a swipe released slowly travels to
 * dismiss its toast, when that is more than `SWIPE_MIN_DISTANCE`. */
export const SWIPE_DISTANCE_FRACTION = 0.4;

/** The speed, in pixels per millisecond in the dismiss direction, at which a released swipe
 * dismisses its toast however short it is. */
export const SWIPE_VELOCITY = 0.5;

/** How long, in milliseconds, a pointer may hold still before release and still count as moving
 * at the speed it last moved at. A swipe that stops and then lets go is not a flick. */
export const SWIPE_VELOCITY_WINDOW = 100;

interface Gesture {
  pointerId: number;
  axis: "x" | "y";
  /** `1` when the dismiss direction is the axis' positive direction (right or down), else `-1`. */
  sign: 1 | -1;
  origin: number;
  /** The distance a slow release has to travel to dismiss. */
  threshold: number;
  /** The toast's size along the axis, which the toast fades out over. */
  size: number;
  /** Whether the pointer has passed `SWIPE_SLOP` and the toast is following it. */
  swiping: boolean;
  /** Displacement in the dismiss direction at the last move, and when it was read. */
  last: number;
  lastTime: number;
  velocity: number;
}

export interface SwipeDismissHandlers {
  onPointerDown: (event: PointerEvent<HTMLElement>) => void;
  onPointerMove: (event: PointerEvent<HTMLElement>) => void;
  onPointerUp: (event: PointerEvent<HTMLElement>) => void;
  onPointerCancel: (event: PointerEvent<HTMLElement>) => void;
  onLostPointerCapture: (event: PointerEvent<HTMLElement>) => void;
  onClickCapture: (event: MouseEvent<HTMLElement>) => void;
}

/** The axis a toast in `placement` swipes along, and its dismiss direction on that axis: toward the
 * edge the region sits against, read in the toast's own writing direction for `start` and `end`. */
function swipeDirection(placement: ToastPlacement, element: HTMLElement): Pick<Gesture, "axis" | "sign"> {
  if (placement === "top-center") return { axis: "y", sign: -1 };
  if (placement === "bottom-center") return { axis: "y", sign: 1 };
  const towardEnd = placement.endsWith("-end");
  const rtl = getComputedStyle(element).direction === "rtl";
  return { axis: "x", sign: towardEnd !== rtl ? 1 : -1 };
}

/**
 * Lets a pointer swipe a toast away toward the edge its region sits against.
 *
 * A press that starts on a button inside the toast never starts a swipe, so the action and dismiss
 * buttons keep their own clicks. Any other press captures the pointer; once it has moved
 * `SWIPE_SLOP` in the dismiss direction the toast follows it, carrying `data-swiping` and an inline
 * `transform` and `opacity`, and `onHold(true)` keeps the toaster's timers paused until the swipe
 * ends. Movement against the dismiss direction holds the toast at rest. A release that has travelled
 * the larger of `SWIPE_MIN_DISTANCE` and `SWIPE_DISTANCE_FRACTION` of the toast's size, or that is
 * moving at `SWIPE_VELOCITY` or faster, calls `onDismiss`; any other release, a `pointercancel` or a
 * lost capture puts the toast back at rest through the stylesheet's transition. The click a browser
 * raises on the toast after a swipe is swallowed; a click after a press that never became a swipe
 * goes through.
 */
export function useSwipeDismiss(placement: ToastPlacement, onDismiss: () => void, onHold: (held: boolean) => void): SwipeDismissHandlers {
  const gesture = useRef<Gesture | null>(null);
  const swallowClick = useRef(false);
  // The handlers below and the unmount cleanup run after the render that produced them, so they
  // read the latest callbacks from here rather than the ones closed over at mount.
  const latest = useRef({ onDismiss, onHold });
  useLayoutEffect(() => {
    latest.current = { onDismiss, onHold };
  });

  // A toast removed mid-swipe, by `toast.dismiss` or its region unmounting, raises no `pointerup`,
  // so without this its hold on the timers would never be released.
  useEffect(
    () => () => {
      if (gesture.current?.swiping) latest.current.onHold(false);
    },
    [],
  );

  function displacement(current: Gesture, event: PointerEvent<HTMLElement>): number {
    return ((current.axis === "x" ? event.clientX : event.clientY) - current.origin) * current.sign;
  }

  /** Ends `current`, the gesture in progress, and returns the toast to rest. */
  function end(current: Gesture, element: HTMLElement) {
    gesture.current = null;
    if (element.hasPointerCapture(current.pointerId)) element.releasePointerCapture(current.pointerId);
    if (!current.swiping) return;
    element.removeAttribute("data-swiping");
    element.style.removeProperty("transform");
    element.style.removeProperty("opacity");
    latest.current.onHold(false);
  }

  return {
    onPointerDown(event) {
      if (gesture.current !== null) return;
      if (event.pointerType === "mouse" && event.button !== 0) return;
      if ((event.target as Element).closest("button") !== null) return;
      const element = event.currentTarget;
      const { axis, sign } = swipeDirection(placement, element);
      const rect = element.getBoundingClientRect();
      const size = axis === "x" ? rect.width : rect.height;
      gesture.current = {
        pointerId: event.pointerId,
        axis,
        sign,
        origin: axis === "x" ? event.clientX : event.clientY,
        threshold: Math.max(SWIPE_MIN_DISTANCE, size * SWIPE_DISTANCE_FRACTION),
        size,
        swiping: false,
        last: 0,
        lastTime: event.timeStamp,
        velocity: 0,
      };
      swallowClick.current = false;
      element.setPointerCapture(event.pointerId);
    },

    onPointerMove(event) {
      const current = gesture.current;
      if (current === null || current.pointerId !== event.pointerId) return;
      const moved = displacement(current, event);
      const elapsed = event.timeStamp - current.lastTime;
      if (elapsed > 0) current.velocity = (moved - current.last) / elapsed;
      current.last = moved;
      current.lastTime = event.timeStamp;
      const offset = Math.max(0, moved);
      if (!current.swiping) {
        if (offset < SWIPE_SLOP) return;
        current.swiping = true;
        event.currentTarget.setAttribute("data-swiping", "");
        latest.current.onHold(true);
      }
      const distance = offset * current.sign;
      event.currentTarget.style.transform = current.axis === "x" ? `translateX(${distance}px)` : `translateY(${distance}px)`;
      event.currentTarget.style.opacity = String(Math.max(0, 1 - offset / current.size));
    },

    onPointerUp(event) {
      const current = gesture.current;
      if (current === null || current.pointerId !== event.pointerId) return;
      const travelled = displacement(current, event);
      const velocity = event.timeStamp - current.lastTime > SWIPE_VELOCITY_WINDOW ? 0 : current.velocity;
      const swiped = current.swiping;
      end(current, event.currentTarget);
      if (!swiped) return;
      // The browser raises this click in the same task as the `pointerup`, so clearing the flag in
      // the next one swallows that click and never a later one, such as a keyboard press on a button.
      swallowClick.current = true;
      setTimeout(() => {
        swallowClick.current = false;
      });
      if (travelled >= current.threshold || velocity >= SWIPE_VELOCITY) latest.current.onDismiss();
    },

    onPointerCancel(event) {
      const current = gesture.current;
      if (current?.pointerId === event.pointerId) end(current, event.currentTarget);
    },

    onLostPointerCapture(event) {
      const current = gesture.current;
      if (current?.pointerId === event.pointerId) end(current, event.currentTarget);
    },

    onClickCapture(event) {
      if (!swallowClick.current) return;
      swallowClick.current = false;
      event.preventDefault();
      event.stopPropagation();
    },
  };
}
