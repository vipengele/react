import type { ReactNode, Ref } from "react";
import { OverlayTreeShell } from "../internal/overlayTree.js";
import { useModalDialog } from "../internal/useModalDialog.js";
import { dialogStylesheet } from "./Dialog.stylesheet.js";

/**
 * The dialog's accessible name. A modal dialog with no name is announced as a bare "dialog", so
 * exactly one of `aria-label` and `aria-labelledby` is required. Both at once is refused: ARIA
 * gives `aria-labelledby` precedence, so an `aria-label` beside it is never read.
 */
type DialogNameProps =
  | {
      /** The dialog's accessible name, as text. */
      "aria-label": string;
      "aria-labelledby"?: never;
    }
  | {
      /** The id of the element whose text names the dialog — usually its heading. */
      "aria-labelledby": string;
      "aria-label"?: never;
    };

export type DialogProps = DialogNameProps & {
  /** The panel's content. The dialog draws no header, footer or close button of its own. */
  children: ReactNode;
  /** Controls the dialog. Supplying it hands the state to the caller: the dialog then opens and
   * closes only when this prop changes, and reports every request through `onOpenChange`. */
  open?: boolean;
  /** Seeds the uncontrolled state. Ignored once `open` is supplied. */
  defaultOpen?: boolean;
  /** Fired for every close request — `Escape`, a backdrop click, a `method="dialog"` form
   * submission, a close the browser forces — in both the controlled and the uncontrolled form. */
  onOpenChange?: (open: boolean) => void;
  /** Whether a click on the backdrop requests a close. */
  closeOnBackdropClick?: boolean;
  /** The id of the element describing the dialog, announced after its name. */
  "aria-describedby"?: string;
  /** `"alertdialog"` marks a dialog that interrupts to demand a response, such as a destructive
   * confirmation, so assistive technology announces it as an alert. */
  role?: "dialog" | "alertdialog";
  /** Composed onto the `<dialog>`, not onto the inner panel. */
  className?: string;
  /** A ref to the `<dialog>` element itself. */
  ref?: Ref<HTMLDialogElement>;
};

/**
 * A modal dialog: a native `<dialog>` opened with `showModal()`, so the browser puts it in the top
 * layer and makes the rest of the page inert, so focus never reaches it.
 *
 * The element closes only when the open state says so. `Escape`, a backdrop click and a
 * `method="dialog"` form submission each call `onOpenChange(false)` and leave the element open,
 * so a controlled parent that keeps `open` true vetoes the close. A close the browser forces
 * regardless — a second `Escape` its close-watcher refuses to let `cancel` stop, or a caller's
 * own `close()` through the ref — is reported the same way and undone by a fresh `showModal()`
 * when the parent still holds `open`.
 *
 * It renders inline rather than portaling: the top layer paints it above everything and makes
 * the page behind it inert wherever it sits in the DOM, and staying inside `.vpg-root` keeps
 * every `--vpg-*` property inherited. It carries `data-vpg-overlay-root`, so an overlay opened
 * from inside it portals into it rather than into the inert page.
 *
 * It is a node of the overlay tree, so `Escape` closes only the innermost open overlay: one
 * opened from inside the dialog closes first, and the dialog stays open until the next `Escape`.
 */
export function Dialog(props: DialogProps) {
  return (
    <OverlayTreeShell>
      <DialogInner {...props} />
    </OverlayTreeShell>
  );
}

function DialogInner({
  children,
  open,
  defaultOpen,
  onOpenChange,
  closeOnBackdropClick = true,
  role = "dialog",
  className,
  ref,
  ...aria
}: DialogProps) {
  const { dialogProps, node } = useModalDialog({ open, defaultOpen, onOpenChange, closeOnBackdropClick, ref });

  return (
    <>
      {/*
        React 19 hoists and de-duplicates this by `href`, so N dialogs on a page inject one
        stylesheet.
      */}
      <style href="vpg-dialog" precedence="vpg-dialog">
        {dialogStylesheet}
      </style>
      {/*
        The `open` attribute is never rendered: set from markup it opens the dialog non-modally,
        and `showModal()` then throws on an element that is already open.
      */}
      {node(
        <dialog
          {...aria}
          role={role}
          className={["vpg-dialog", className].filter(Boolean).join(" ")}
          data-vpg-overlay-root=""
          {...dialogProps}
        >
          <div className="vpg-dialog-panel">{children}</div>
        </dialog>,
      )}
    </>
  );
}
