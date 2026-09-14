import {
  autoUpdate,
  flip,
  offset,
  shift,
  useDismiss,
  useFloating,
  useFocus,
  useHover,
  useInteractions,
  useRole,
} from "@floating-ui/react";
import { cloneElement, Fragment, isValidElement, type ReactNode, useState } from "react";
import { createPortal } from "react-dom";
import { tooltipStylesheet } from "./Tooltip.stylesheet.js";

export type TooltipPlacement = "top" | "bottom" | "left" | "right";

export interface TooltipProps {
  /** The label the bubble shows. */
  content: ReactNode;
  /** The element the bubble describes. It is wrapped in a `<span>` that carries the ref and the
   * hover/focus handlers — not cloned for those, so it can be any node, including a component
   * that doesn't forward a ref or spread unknown props. When it is a single element, it is
   * additionally cloned with just `aria-describedby` merged on, so the description is announced
   * on the actual focusable control rather than the (never-focused) wrapper. */
  children: ReactNode;
  /** Preferred side of the trigger. Floating-ui flips to the opposite side when the bubble
   * wouldn't fit there. */
  placement?: TooltipPlacement;
  /** Suppresses the tooltip entirely: no hover or focus handler is registered and the bubble
   * never renders. Lives on `Tooltip` rather than being read off the trigger's props, because
   * the trigger is wrapped rather than cloned — its props are never inspected. */
  disabled?: boolean;
  /** Composed onto the bubble, not onto the trigger wrapper. */
  className?: string;
}

/** Gap between the trigger and the bubble, in pixels. */
const TOOLTIP_OFFSET = 8;

/** Minimum gap kept between the bubble and the viewport edge when it has to shift, in pixels. */
const VIEWPORT_PADDING = 8;

/**
 * A small floating label describing its trigger, shown on hover and on keyboard focus and
 * dismissed on `Escape`.
 *
 * The bubble portals into the nearest ancestor `.tandiko-root` rather than `document.body`:
 * `ThemeProvider` assigns every `--tandiko-*` property on `.tandiko-root`, so a bubble outside
 * that subtree would resolve every `var()` to nothing and lose colour-mode adaptation entirely.
 * With no `.tandiko-root` ancestor — an unthemed page, or a test rendering the component on its
 * own — the bubble renders inline as the trigger's sibling instead. It is positioned by the same
 * computed coordinates either way; only the `--tandiko-*` values it inherits differ.
 */
export function Tooltip({
  content,
  children,
  placement = "top",
  disabled = false,
  className,
}: TooltipProps) {
  const [requestedOpen, setRequestedOpen] = useState(false);
  const enabled = !disabled;
  const open = requestedOpen && enabled;

  const { refs, floatingStyles, context, elements } = useFloating({
    open,
    onOpenChange: setRequestedOpen,
    placement,
    middleware: [offset(TOOLTIP_OFFSET), flip(), shift({ padding: VIEWPORT_PADDING })],
    whileElementsMounted: autoUpdate,
  });

  // `useRole` with `role: "tooltip"` is what pairs `role`/`id` on the bubble with
  // `aria-describedby` on the trigger wrapper, off a `useId`-generated id it owns; setting
  // either half by hand would leave the other pointing at a different id.
  const hover = useHover(context, { enabled });
  const focus = useFocus(context, { enabled });
  const dismiss = useDismiss(context, { enabled, referencePress: false });
  const tooltipRole = useRole(context, { enabled, role: "tooltip" });
  const { getReferenceProps, getFloatingProps } = useInteractions([
    hover,
    focus,
    dismiss,
    tooltipRole,
  ]);

  // `aria-describedby` has to sit on the element that actually receives focus, or a screen
  // reader never announces it — the wrapper `<span>` itself is never focused. When `children` is
  // a single element, it is cloned with just this one plain prop merged on (not the ref or the
  // hover/focus handlers, which a component that doesn't forward refs — `Button` included —
  // can't accept; see `wrap-trigger-never-clone.md`). Anything else (plain text, a fragment,
  // multiple nodes) has no single focusable target to clone onto, so the description falls back
  // to the wrapper.
  const { "aria-describedby": describedBy, ...referenceProps } = getReferenceProps() as Record<
    string,
    unknown
  > & { "aria-describedby"?: string };
  // A `Fragment` passes `isValidElement` too, but wraps zero or more children rather than
  // naming one DOM node to clone the prop onto — excluded the same as text, arrays, and
  // everything else that falls back to the wrapper.
  const hasSingleElementChild =
    isValidElement<{ "aria-describedby"?: string }>(children) && children.type !== Fragment;
  const trigger = hasSingleElementChild
    ? cloneElement(children, { "aria-describedby": describedBy })
    : children;

  const bubble = open ? (
    <div
      ref={refs.setFloating}
      className={["tandiko-tooltip", className].filter(Boolean).join(" ")}
      style={floatingStyles}
      {...getFloatingProps()}
    >
      {content}
    </div>
  ) : null;

  const themeRoot = elements.domReference?.closest(".tandiko-root") ?? null;

  return (
    <>
      {/*
        React 19 hoists and de-duplicates this by `href`, so N tooltips on a page inject one
        stylesheet.
      */}
      <style href="tandiko-tooltip" precedence="tandiko-tooltip">
        {tooltipStylesheet}
      </style>
      <span
        ref={refs.setReference}
        className="tandiko-tooltip-trigger"
        aria-describedby={hasSingleElementChild ? undefined : describedBy}
        {...referenceProps}
      >
        {trigger}
      </span>
      {bubble !== null && themeRoot !== null ? createPortal(bubble, themeRoot) : bubble}
    </>
  );
}
