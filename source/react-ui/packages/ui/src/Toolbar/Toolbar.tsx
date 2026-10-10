import { type FocusEvent, type HTMLAttributes, type ReactNode, useCallback, useLayoutEffect, useRef } from "react";
import { useRovingFocus } from "../internal/useRovingFocus.js";
import { toolbarStylesheet } from "./Toolbar.stylesheet.js";

export type ToolbarOrientation = "horizontal" | "vertical";

export interface ToolbarProps extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "role"> {
  /** Which arrow pair moves between items, and which way the items are laid out. */
  orientation?: ToolbarOrientation;
  children?: ReactNode;
}

/**
 * The toolbar's items: every natively enabled button, link and form control among its
 * descendants, at any depth, so a `ButtonGroup`'s buttons and a `MenuButton`'s inner `Button`
 * count as items of their own. A natively disabled control is not an item and is never focused;
 * an `aria-disabled` one is, and stays a stop for the arrows.
 */
const ITEM_SELECTOR = [
  "button:not(:disabled)",
  "a[href]",
  // biome-ignore lint/security/noSecrets: a CSS selector, read as a high-entropy string
  'input:not([type="hidden"]):not(:disabled)',
  "select:not(:disabled)",
  "textarea:not(:disabled)",
].join(", ");

/** Attributes whose change can add an element to the items or remove one from them. */
const ITEM_ATTRIBUTES = ["disabled", "href", "type"];

/**
 * Gives exactly one item `tabindex="0"` — `preferred` while it is still an item, the first item
 * otherwise — and every other item `tabindex="-1"`. Only attributes that differ are written, so
 * an unchanged toolbar produces no mutations.
 */
function syncTabStop(container: HTMLElement, preferred: HTMLElement | null) {
  const items = Array.from(container.querySelectorAll<HTMLElement>(ITEM_SELECTOR));
  const stop = preferred !== null && items.includes(preferred) ? preferred : items[0];
  for (const item of items) {
    const tabIndex = item === stop ? "0" : "-1";
    if (item.getAttribute("tabindex") !== tabIndex) item.setAttribute("tabindex", tabIndex);
  }
}

/**
 * A `role="toolbar"` container whose items share one tab stop: `Tab` enters the toolbar on the
 * item focused last (the first item before any has been), the orientation's arrows, `Home` and
 * `End` move between items, and one more `Tab` leaves. An item that edits text or adjusts a value
 * — a text input, a slider — keeps `ArrowLeft`, `ArrowRight`, `Home` and `End` for itself,
 * whatever the orientation. In a vertical toolbar `ArrowUp` and `ArrowDown` still move between
 * items, even from such an item, so `Tab` is the way out; a horizontal one leaves them alone.
 *
 * Children are rendered unmodified. The tab stop is written imperatively as `tabindex` on the
 * items in the DOM, because the toolbar cannot clone arbitrary children, and any `tabIndex` a
 * caller gives an item is overwritten. It is re-written after every render of the toolbar, on
 * every focus within it, and whenever items are added, removed, enabled or disabled anywhere
 * below it — so an item unmounting or turning natively disabled while the toolbar is not focused
 * hands the stop to the first item rather than leaving the toolbar out of the tab order.
 *
 * Name the toolbar with `aria-label` or `aria-labelledby` when a page holds more than one.
 */
export function Toolbar({ orientation = "horizontal", className, children, onFocus, onKeyDown, ...rest }: ToolbarProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);
  const classes = ["vpg-toolbar", `vpg-toolbar-${orientation}`, className].filter(Boolean).join(" ");

  const { onKeyDown: handleKeyDown } = useRovingFocus<HTMLDivElement>({
    itemSelector: ITEM_SELECTOR,
    orientation,
    disabledPolicy: "focusable",
    onKeyDown,
  });

  // A child that re-renders on its own never re-renders the toolbar, so the observer is what
  // catches an item it unmounts or disables.
  useLayoutEffect(() => {
    const container = containerRef.current as HTMLDivElement;
    const observer = new MutationObserver(() => syncTabStop(container, lastFocusedRef.current));
    observer.observe(container, { subtree: true, childList: true, attributes: true, attributeFilter: ITEM_ATTRIBUTES });
    return () => observer.disconnect();
  }, []);

  // No dependency array: the toolbar's own render can change its items, and the stop has to be
  // in place before the browser paints or a `Tab` lands.
  useLayoutEffect(() => {
    syncTabStop(containerRef.current as HTMLDivElement, lastFocusedRef.current);
  });

  const handleFocus = useCallback(
    (event: FocusEvent<HTMLDivElement>) => {
      onFocus?.(event);
      // React bubbles focus out of a portal along the component tree, so a control in a popover
      // opened from the toolbar reaches this handler without being one of its items.
      const target = event.target as HTMLElement;
      if (event.currentTarget.contains(target) && target.matches(ITEM_SELECTOR)) lastFocusedRef.current = target;
      syncTabStop(event.currentTarget, lastFocusedRef.current);
    },
    [onFocus],
  );

  return (
    <>
      {/*
        React 19 hoists and de-duplicates this by `href`, so N toolbars on a page inject one
        stylesheet.
      */}
      <style href="vpg-toolbar" precedence="vpg-toolbar">
        {toolbarStylesheet}
      </style>
      <div
        {...rest}
        ref={containerRef}
        role="toolbar"
        aria-orientation={orientation}
        className={classes}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
      >
        {children}
      </div>
    </>
  );
}
