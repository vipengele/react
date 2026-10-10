import { type ReactNode, type Ref, useEffect, useRef, useState } from "react";
import { OverlayTreeShell } from "../internal/overlayTree.js";
import { useModalDialog } from "../internal/useModalDialog.js";
import { useOverlayRoot } from "../internal/useOverlayRoot.js";
import { useOverlayState } from "../internal/useOverlayState.js";
import { drawerStylesheet } from "./Drawer.stylesheet.js";

/**
 * The drawer's accessible name. A drawer with no name is announced as a bare "dialog", so
 * exactly one of `aria-label` and `aria-labelledby` is required. Both at once is refused: ARIA
 * gives `aria-labelledby` precedence, so an `aria-label` beside it is never read.
 */
type DrawerNameProps =
  | {
      /** The drawer's accessible name, as text. */
      "aria-label": string;
      "aria-labelledby"?: never;
    }
  | {
      /** The id of the element whose text names the drawer — usually its heading. */
      "aria-labelledby": string;
      "aria-label"?: never;
    };

type DrawerCommonProps = DrawerNameProps & {
  /** The panel's content. The drawer draws no header, footer or close button of its own. */
  children: ReactNode;
  /** Controls the drawer. Supplying it hands the state to the caller: the drawer then opens and
   * closes only when this prop changes, and reports every request through `onOpenChange`. */
  open?: boolean;
  /** Seeds the uncontrolled state. Ignored once `open` is supplied. */
  defaultOpen?: boolean;
  /** Fired for every close request — `Escape`, and, when modal, a backdrop click, a
   * `method="dialog"` form submission and a close the browser forces, or, when non-modal and
   * `closeOnOutsideClick` is on, a press outside the drawer — in both the controlled and the
   * uncontrolled form. */
  onOpenChange?: (open: boolean) => void;
  /** The viewport edge the drawer is anchored to and slides in from. The values are physical:
   * `"left"` is the left edge in a right-to-left document too. */
  side?: "left" | "right" | "top" | "bottom";
  /** The id of the element describing the drawer, announced after its name. */
  "aria-describedby"?: string;
  /** `"alertdialog"` marks a drawer that interrupts to demand a response, so assistive technology
   * announces it as an alert. */
  role?: "dialog" | "alertdialog";
  /** Composed onto the drawer element — the `<dialog>` when modal, the `<div>` otherwise — not
   * onto the inner panel. */
  className?: string;
};

type DrawerModalProps = {
  /**
   * Whether the drawer is a modal surface. A modal drawer, the default, is a `<dialog>` in the top
   * layer that makes the rest of the page inert and locks its scroll. A non-modal drawer
   * (`modal={false}`) is a page-layer panel at the `--vpg-layer-drawer` step: no backdrop, no
   * focus trap, no scroll lock, and the page behind it stays interactive.
   */
  modal?: true;
  /** Whether a click on the backdrop requests a close. */
  closeOnBackdropClick?: boolean;
  closeOnOutsideClick?: never;
  /** A ref to the `<dialog>` element itself. */
  ref?: Ref<HTMLDialogElement>;
};

type DrawerNonModalProps = {
  /** See the modal form. `false` renders the drawer as a non-modal, page-layer panel. */
  modal: false;
  /**
   * Whether a press outside the drawer, and outside every overlay opened from inside it, requests
   * a close. Off by default, so a docked panel survives clicks on the page.
   *
   * The drawer has no trigger element, so a press on the consumer's own button that toggles it
   * counts as outside. With this on, pressing that button while the drawer is open requests a
   * close through `onOpenChange(false)`, and the button's own click handler then opens it again
   * in the same tick, so the drawer appears not to close. There is no way to exempt an element;
   * a drawer opened by a toggle button leaves this off, or closes from a control inside it.
   */
  closeOnOutsideClick?: boolean;
  closeOnBackdropClick?: never;
  /** A ref to the drawer's `<div>` element itself. */
  ref?: Ref<HTMLDivElement>;
};

export type DrawerProps = DrawerCommonProps & (DrawerModalProps | DrawerNonModalProps);

/** The elements focus moves to when a non-modal drawer opens: the first that is reachable with
 * `Tab`. */
const FOCUSABLE =
  // biome-ignore lint/security/noSecrets: a CSS selector, read as a high-entropy string
  ':is(a[href], area[href], button:not(:disabled), input:not(:disabled):not([type="hidden"]), select:not(:disabled), textarea:not(:disabled), iframe, summary, audio[controls], video[controls], [contenteditable=""], [contenteditable="true"], [contenteditable="plaintext-only"], [tabindex]):not([tabindex^="-"])';

/**
 * A panel anchored to one edge of the viewport.
 *
 * Modal, the default, it is a native `<dialog>` opened with `showModal()`, so the browser puts it
 * in the top layer and makes the rest of the page inert. It closes exactly as `Dialog` does —
 * `Escape`, a backdrop click and a `method="dialog"` form submission request a close that a
 * controlled parent can veto, and a close the browser forces is undone by a fresh `showModal()`
 * while the parent still holds `open`. It renders inline rather than portaling, and carries
 * `data-vpg-overlay-root`, so an overlay opened from inside it portals into it rather than into
 * the inert page.
 *
 * With `modal={false}` it is a `<div role="dialog">` on the page layer, at the
 * `--vpg-layer-drawer` step, portaled through `useOverlayRoot` from a hidden inline sentinel: into
 * the nearest modal surface around it, else the nearest `.vpg-root`, else nowhere — it renders
 * inline. It carries no `aria-modal` and no `data-vpg-overlay-root`, so the page behind it stays
 * interactive and scrollable and an overlay opened from inside it portals past it. Opening moves
 * focus to its first focusable element, or to the drawer itself when it holds none; closing
 * returns focus to the element that held it before, provided focus has not since moved on to the
 * page and that element is still connected.
 *
 * Either way it is a node of the overlay tree, so `Escape` closes an overlay opened from inside it
 * before the drawer itself.
 */
export function Drawer(props: DrawerProps) {
  return <OverlayTreeShell>{props.modal === false ? <NonModalDrawer {...props} /> : <ModalDrawer {...props} />}</OverlayTreeShell>;
}

function DrawerStylesheet() {
  return (
    // React 19 hoists and de-duplicates this by `href`, so N drawers on a page inject one
    // stylesheet.
    <style href="vpg-drawer" precedence="vpg-drawer">
      {drawerStylesheet}
    </style>
  );
}

function ModalDrawer({
  children,
  open,
  defaultOpen,
  onOpenChange,
  closeOnBackdropClick = true,
  side = "right",
  role = "dialog",
  className,
  ref,
  modal: _modal,
  closeOnOutsideClick: _closeOnOutsideClick,
  ...aria
}: DrawerCommonProps & DrawerModalProps) {
  const { dialogProps, node } = useModalDialog({ open, defaultOpen, onOpenChange, closeOnBackdropClick, ref });

  return (
    <>
      <DrawerStylesheet />
      {/*
        The `open` attribute is never rendered: set from markup it opens the dialog non-modally,
        and `showModal()` then throws on an element that is already open.
      */}
      {node(
        <dialog
          {...aria}
          role={role}
          className={["vpg-drawer", className].filter(Boolean).join(" ")}
          data-side={side}
          data-vpg-overlay-root=""
          {...dialogProps}
        >
          <div className="vpg-drawer-panel">{children}</div>
        </dialog>,
      )}
    </>
  );
}

function NonModalDrawer({
  children,
  open,
  defaultOpen,
  onOpenChange,
  closeOnOutsideClick = false,
  side = "right",
  role = "dialog",
  className,
  ref,
  modal: _modal,
  closeOnBackdropClick: _closeOnBackdropClick,
  ...aria
}: DrawerCommonProps & DrawerNonModalProps) {
  const { isOpen, floatingRef, node } = useOverlayState({
    open,
    defaultOpen,
    onOpenChange,
    outsidePress: closeOnOutsideClick,
  });
  // The drawer has no trigger to resolve its portal target from, so this inline sentinel stands
  // in for one. The drawer waits for it to mount, so it never renders once in the wrong place.
  const [sentinel, setSentinel] = useState<HTMLSpanElement | null>(null);
  const { portal } = useOverlayRoot(sentinel);
  const drawerRef = useRef<HTMLDivElement>(null);
  const shown = isOpen && sentinel !== null;

  // Registered from an effect rather than from `setRef`, which is a new function on every render
  // and so is detached and reattached each time.
  useEffect(() => {
    floatingRef(shown ? drawerRef.current : null);
  }, [shown, floatingRef]);

  useEffect(() => {
    const drawer = drawerRef.current;
    if (!shown || drawer === null) {
      return;
    }
    const doc = drawer.ownerDocument;
    const previous = doc.activeElement;
    (drawer.querySelector<HTMLElement>(FOCUSABLE) ?? drawer).focus();
    return () => {
      // The cleanup runs once the drawer has left the DOM, so focus that was inside it has dropped
      // to the body. Focus the user has since moved on to the page stays where it is.
      const active = doc.activeElement;
      const focusWasInDrawer = active === null || active === doc.body || drawer.contains(active);
      if (focusWasInDrawer && previous instanceof HTMLElement && previous.isConnected) {
        previous.focus();
      }
    };
  }, [shown]);

  const setRef = (element: HTMLDivElement | null) => {
    drawerRef.current = element;
    // A caller's ref is a function, an object, or absent; forwarding it by hand is what lets the
    // drawer keep a ref of its own to the same element.
    if (typeof ref === "function") {
      ref(element);
    } else if (ref) {
      ref.current = element;
    }
  };

  return (
    <>
      <DrawerStylesheet />
      <span hidden ref={setSentinel} />
      {shown
        ? portal(
            node(
              <div
                {...aria}
                ref={setRef}
                role={role}
                tabIndex={-1}
                className={["vpg-drawer", className].filter(Boolean).join(" ")}
                data-side={side}
                data-modal="false"
              >
                <div className="vpg-drawer-panel">{children}</div>
              </div>,
            ),
          )
        : null}
    </>
  );
}
