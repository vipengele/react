import {
  autoUpdate,
  FloatingFocusManager,
  flip,
  offset,
  shift,
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
  useRole,
} from "@floating-ui/react";
import { type AriaAttributes, cloneElement, Fragment, isValidElement, type ReactNode, useState } from "react";
import { createPortal } from "react-dom";
import { popoverStylesheet } from "./Popover.stylesheet.js";

/** Deliberately a copy of `TooltipPlacement` rather than an import of it: one directory per
 * component, with no edge between two components that merely happen to accept the same four
 * sides. */
export type PopoverPlacement = "top" | "bottom" | "left" | "right";

export interface PopoverProps {
  /** What the panel holds. A plain node rather than a render prop taking a `close` callback:
   * content that has to close the popover itself belongs in the controlled form, where the
   * consumer already owns the state and the `onOpenChange` handler. */
  content: ReactNode;
  /** The element the panel hangs off. It is wrapped in a `<span>` that carries the ref and the
   * click handler — not cloned for those, so it can be any node, including a component that
   * doesn't forward a ref or spread unknown props. When it is a single element, it is
   * additionally cloned with `aria-haspopup`/`aria-expanded`/`aria-controls` merged on, so
   * assistive tech operating the actual control gets its dialog semantics. */
  children: ReactNode;
  /** Controls the panel. Supplying it hands the state to the caller: the popover then opens and
   * closes only when this prop changes, and reports every request through `onOpenChange`. */
  open?: boolean;
  /** Seeds the uncontrolled state. Ignored once `open` is supplied. */
  defaultOpen?: boolean;
  /** Fired for every open/close request — a trigger click, an outside press, `Escape` — in both
   * the controlled and the uncontrolled form. */
  onOpenChange?: (open: boolean) => void;
  /** Preferred side of the trigger. Floating-ui flips to the opposite side when the panel
   * wouldn't fit there. */
  placement?: PopoverPlacement;
  /** Composed onto the panel, not onto the trigger wrapper. */
  className?: string;
}

/** Gap between the trigger and the panel, in pixels. */
const POPOVER_OFFSET = 10;

/** Minimum gap kept between the panel and the viewport edge when it has to shift, in pixels. */
const VIEWPORT_PADDING = 12;

/**
 * A floating panel of interactive content, opened by clicking its trigger and dismissed by an
 * outside press, by `Escape`, or by clicking the trigger again.
 *
 * Focus is trapped inside the panel while it is open and returned to the trigger when it closes —
 * the panel holds real interactive content, so keyboard users must be able to reach it and must
 * not fall out the back of it into the page behind.
 *
 * The panel portals into the nearest ancestor `.vpg-root` rather than `document.body`:
 * `ThemeProvider` assigns every `--vpg-*` property on `.vpg-root`, so a panel outside that
 * subtree would resolve every `var()` to nothing and lose colour-mode adaptation entirely. With no
 * `.vpg-root` ancestor — an unthemed page, or a test rendering the component on its own — the
 * panel renders inline as the trigger's sibling instead. It is positioned by the same computed
 * coordinates either way; only the `--vpg-*` values it inherits differ.
 */
export function Popover({ content, children, open, defaultOpen = false, onOpenChange, placement = "bottom", className }: PopoverProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const isOpen = open ?? uncontrolledOpen;

  const handleOpenChange = (next: boolean) => {
    // The internal state is kept only while `open` is absent. Writing it in the controlled form
    // too would leave a stale value behind for the moment `open` is later withdrawn.
    if (open === undefined) {
      setUncontrolledOpen(next);
    }
    onOpenChange?.(next);
  };

  const { refs, floatingStyles, context, elements } = useFloating({
    open: isOpen,
    onOpenChange: handleOpenChange,
    placement,
    middleware: [offset(POPOVER_OFFSET), flip(), shift({ padding: VIEWPORT_PADDING })],
    whileElementsMounted: autoUpdate,
  });

  // `useRole` with `role: "dialog"` is what pairs `role`/`id` on the panel with
  // `aria-expanded`/`aria-haspopup`/`aria-controls` on the trigger wrapper, off a `useId`-generated
  // id it owns; setting either half by hand would leave the other pointing at a different id.
  const click = useClick(context);
  const dismiss = useDismiss(context);
  const dialogRole = useRole(context, { role: "dialog" });
  const { getReferenceProps, getFloatingProps } = useInteractions([click, dismiss, dialogRole]);

  // `aria-haspopup`/`aria-expanded`/`aria-controls` describe the operable trigger control to
  // assistive tech, not an inert wrapper — the wrapper `<span>` never receives focus, so
  // attributes on it are invisible to a screen reader operating the actual control. When
  // `children` is a single element (and not a `Fragment`, which names no single DOM node), it is
  // cloned with just these plain props merged on — not the ref or the click/dismiss handlers,
  // which a component that doesn't forward refs (`Button` included) can't accept; see
  // `wrap-trigger-never-clone.md`. The click handler stays on the wrapper regardless: a click
  // anywhere inside it, nested child included, bubbles up to it either way.
  const {
    "aria-haspopup": ariaHaspopup,
    "aria-expanded": ariaExpanded,
    "aria-controls": ariaControls,
    ...referenceProps
  } = getReferenceProps() as Record<string, unknown> & {
    "aria-haspopup"?: AriaAttributes["aria-haspopup"];
    "aria-expanded"?: AriaAttributes["aria-expanded"];
    "aria-controls"?: AriaAttributes["aria-controls"];
  };
  const hasSingleElementChild =
    isValidElement<{
      "aria-haspopup"?: AriaAttributes["aria-haspopup"];
      "aria-expanded"?: AriaAttributes["aria-expanded"];
      "aria-controls"?: AriaAttributes["aria-controls"];
    }>(children) && children.type !== Fragment;
  const trigger = hasSingleElementChild
    ? cloneElement(children, {
        "aria-haspopup": ariaHaspopup,
        "aria-expanded": ariaExpanded,
        "aria-controls": ariaControls,
      })
    : children;

  const panel = isOpen ? (
    <FloatingFocusManager context={context} modal>
      <div
        ref={refs.setFloating}
        className={["vpg-popover", className].filter(Boolean).join(" ")}
        style={floatingStyles}
        {...getFloatingProps()}
      >
        {content}
      </div>
    </FloatingFocusManager>
  ) : null;

  const themeRoot = elements.domReference?.closest(".vpg-root") ?? null;

  return (
    <>
      {/*
        React 19 hoists and de-duplicates this by `href`, so N popovers on a page inject one
        stylesheet.
      */}
      <style href="vpg-popover" precedence="vpg-popover">
        {popoverStylesheet}
      </style>
      {/* biome-ignore lint/a11y/useAriaPropsSupportedByRole: aria-expanded here only reaches a bare span in the fallback case (non-single-element children), the least-wrong place left per wrap-trigger-never-clone.md */}
      <span
        ref={refs.setReference}
        className="vpg-popover-trigger"
        aria-haspopup={hasSingleElementChild ? undefined : ariaHaspopup}
        aria-expanded={hasSingleElementChild ? undefined : ariaExpanded}
        aria-controls={hasSingleElementChild ? undefined : ariaControls}
        {...referenceProps}
      >
        {trigger}
      </span>
      {panel !== null && themeRoot !== null ? createPortal(panel, themeRoot) : panel}
    </>
  );
}
