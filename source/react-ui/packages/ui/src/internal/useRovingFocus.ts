import { type KeyboardEvent, useCallback } from "react";

/** Roles whose element interprets the inline arrows, `Home` and `End` itself. */
const KEY_OWNING_ROLES = new Set(["slider", "spinbutton", "combobox", "textbox", "searchbox"]);

/** Keys a text-editing or value-adjusting element owns, which the hook never takes from it. */
const YIELDED_KEYS = new Set(["ArrowLeft", "ArrowRight", "Home", "End"]);

export interface UseRovingFocusOptions<E extends HTMLElement = HTMLElement> {
  /** Selects the items, in document order, among the container's descendants. Disabled ones
   * included: `disabledPolicy` decides what happens to them. */
  itemSelector: string;
  /** Which arrow pair moves between items. The off-axis pair is never handled, so it keeps
   * whatever meaning the surrounding page gives it. */
  orientation?: "horizontal" | "vertical";
  /** Whether the arrows wrap from the last item to the first and back. Unwrapped, an arrow at
   * either end is still handled and moves nowhere. */
  wrap?: boolean;
  /** `"skip"` leaves items that are `:disabled` or `aria-disabled="true"` out of every move;
   * `"focusable"` keeps them as stops, for a widget whose disabled items stay discoverable. */
  disabledPolicy?: "skip" | "focusable";
  /** The consumer's own keydown handler. It runs first, and a `preventDefault()` in it stops
   * the hook from acting on the key. */
  onKeyDown?: (event: KeyboardEvent<E>) => void;
  /** Called with the item focus moved to. The tab stop belongs to the caller, which moves it
   * here — or from the item's own `focus` event. */
  onNavigate?: (item: HTMLElement) => void;
}

export interface UseRovingFocusReturn<E extends HTMLElement = HTMLElement> {
  /** The container's keydown handler. */
  onKeyDown: (event: KeyboardEvent<E>) => void;
}

function isDisabled(item: HTMLElement): boolean {
  return item.matches(":disabled") || item.getAttribute("aria-disabled") === "true";
}

/** Whether `target` edits text or adjusts a value, and so owns the inline arrows, `Home` and
 * `End`. Tab is the way out of it. */
function ownsInlineKeys(target: HTMLElement): boolean {
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target.isContentEditable) {
    return true;
  }
  return KEY_OWNING_ROLES.has(target.getAttribute("role") ?? "");
}

/**
 * The first item reached from `from` stepping by `delta` that the policy lets focus land on, or
 * `undefined` when there is none. Wrapping steps modulo the item count and gives up after one
 * full lap; unwrapped stepping gives up at either end.
 */
function stepFrom(items: readonly HTMLElement[], from: number, delta: 1 | -1, wrap: boolean, skip: boolean): HTMLElement | undefined {
  const count = items.length;
  for (let offset = 1; offset <= count; offset++) {
    let index = from + delta * offset;
    if (wrap) index = ((index % count) + count) % count;
    else if (index < 0 || index >= count) return undefined;
    const item = items[index] as HTMLElement;
    if (!skip || !isDisabled(item)) return item;
  }
  return undefined;
}

/**
 * Keyboard navigation between the items of a composite widget: the orientation's arrow pair
 * moves to the next or previous item, `Home` and `End` to the first and last. Which physical
 * arrow is "next" in a horizontal group follows the container's computed `direction`.
 *
 * It moves DOM focus and nothing else. It never writes `tabindex`: the caller keeps exactly one
 * item tabbable and moves that stop, through `onNavigate` or the items' focus events.
 *
 * A key pressed anywhere other than on an item itself — a control inside an item, the
 * container — is left alone, so focus never jumps from somewhere the hook cannot place in the
 * sequence. An item that edits text or adjusts a value keeps the inline arrows, `Home` and `End`.
 */
export function useRovingFocus<E extends HTMLElement = HTMLElement>({
  itemSelector,
  orientation = "horizontal",
  wrap = true,
  disabledPolicy = "skip",
  onKeyDown,
  onNavigate,
}: UseRovingFocusOptions<E>): UseRovingFocusReturn<E> {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent<E>) => {
      onKeyDown?.(event);
      if (event.defaultPrevented) return;

      const target = event.target as HTMLElement;
      if (YIELDED_KEYS.has(event.key) && ownsInlineKeys(target)) return;

      const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(itemSelector));
      const current = items.indexOf(target);
      if (current === -1) return;

      let previousKey = "ArrowUp";
      let nextKey = "ArrowDown";
      if (orientation === "horizontal") {
        const rtl = getComputedStyle(event.currentTarget).direction === "rtl";
        previousKey = rtl ? "ArrowRight" : "ArrowLeft";
        nextKey = rtl ? "ArrowLeft" : "ArrowRight";
      }

      const skip = disabledPolicy === "skip";
      let next: HTMLElement | undefined;
      if (event.key === nextKey) next = stepFrom(items, current, 1, wrap, skip);
      else if (event.key === previousKey) next = stepFrom(items, current, -1, wrap, skip);
      else if (event.key === "Home") next = stepFrom(items, -1, 1, false, skip);
      else if (event.key === "End") next = stepFrom(items, items.length, -1, false, skip);
      else return;

      event.preventDefault();
      if (next === undefined || next === target) return;
      next.focus();
      onNavigate?.(next);
    },
    [itemSelector, orientation, wrap, disabledPolicy, onKeyDown, onNavigate],
  );

  return { onKeyDown: handleKeyDown };
}
