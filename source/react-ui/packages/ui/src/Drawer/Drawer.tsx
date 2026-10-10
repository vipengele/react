import type { ReactNode, Ref } from "react";
import { OverlayTreeShell } from "../internal/overlayTree.js";
import { useModalDialog } from "../internal/useModalDialog.js";
import { drawerStylesheet } from "./Drawer.stylesheet.js";

/**
 * The drawer's accessible name. A modal drawer with no name is announced as a bare "dialog", so
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

export type DrawerProps = DrawerNameProps & {
  /** The panel's content. The drawer draws no header, footer or close button of its own. */
  children: ReactNode;
  /** Controls the drawer. Supplying it hands the state to the caller: the drawer then opens and
   * closes only when this prop changes, and reports every request through `onOpenChange`. */
  open?: boolean;
  /** Seeds the uncontrolled state. Ignored once `open` is supplied. */
  defaultOpen?: boolean;
  /** Fired for every close request — `Escape`, a backdrop click, a `method="dialog"` form
   * submission, a close the browser forces — in both the controlled and the uncontrolled form. */
  onOpenChange?: (open: boolean) => void;
  /** Whether a click on the backdrop requests a close. */
  closeOnBackdropClick?: boolean;
  /** The viewport edge the drawer is anchored to and slides in from. The values are physical:
   * `"left"` is the left edge in a right-to-left document too. */
  side?: "left" | "right" | "top" | "bottom";
  /** The id of the element describing the drawer, announced after its name. */
  "aria-describedby"?: string;
  /** `"alertdialog"` marks a drawer that interrupts to demand a response, so assistive technology
   * announces it as an alert. */
  role?: "dialog" | "alertdialog";
  /** Composed onto the `<dialog>`, not onto the inner panel. */
  className?: string;
  /** A ref to the `<dialog>` element itself. */
  ref?: Ref<HTMLDialogElement>;
};

/**
 * A modal panel anchored to one edge of the viewport: a native `<dialog>` opened with
 * `showModal()`, so the browser puts it in the top layer and makes the rest of the page inert.
 * It closes exactly as `Dialog` does — `Escape`, a backdrop click and a `method="dialog"` form
 * submission request a close that a controlled parent can veto, and a close the browser forces
 * is undone by a fresh `showModal()` while the parent still holds `open`.
 *
 * It renders inline rather than portaling, and carries `data-vpg-overlay-root`, so an overlay
 * opened from inside it portals into it rather than into the inert page. It is a node of the
 * overlay tree, so `Escape` closes an overlay opened from inside it before the drawer itself.
 */
export function Drawer(props: DrawerProps) {
  return (
    <OverlayTreeShell>
      <DrawerInner {...props} />
    </OverlayTreeShell>
  );
}

function DrawerInner({
  children,
  open,
  defaultOpen,
  onOpenChange,
  closeOnBackdropClick = true,
  side = "right",
  role = "dialog",
  className,
  ref,
  ...aria
}: DrawerProps) {
  const { dialogProps, node } = useModalDialog({ open, defaultOpen, onOpenChange, closeOnBackdropClick, ref });

  return (
    <>
      {/*
        React 19 hoists and de-duplicates this by `href`, so N drawers on a page inject one
        stylesheet.
      */}
      <style href="vpg-drawer" precedence="vpg-drawer">
        {drawerStylesheet}
      </style>
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
