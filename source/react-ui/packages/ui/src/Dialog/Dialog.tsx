import { type FormEvent, type MouseEvent, type ReactNode, type Ref, type SyntheticEvent, useEffect, useRef, useState } from "react";
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
 */
export function Dialog({
  children,
  open,
  defaultOpen = false,
  onOpenChange,
  closeOnBackdropClick = true,
  className,
  ref,
  ...aria
}: DialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const isOpen = open ?? uncontrolledOpen;
  // Bumped by every close the browser performs on its own. A controlled parent that keeps `open`
  // true re-renders with an unchanged `isOpen`, which alone would never re-run the effect below
  // to reopen the element.
  const [browserCloses, setBrowserCloses] = useState(0);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const requestClose = () => {
    // The internal state is kept only while `open` is absent. Writing it in the controlled form
    // too would leave a stale value behind for the moment `open` is later withdrawn.
    if (open === undefined) {
      setUncontrolledOpen(false);
    }
    onOpenChange?.(false);
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: `browserCloses` is a dependency only so that a close the browser performs re-runs this effect
  useEffect(() => {
    // The `<dialog>` is always rendered, so the ref is set by the time any effect runs.
    const dialog = dialogRef.current as HTMLDialogElement;
    if (isOpen) {
      // `showModal()` throws on a dialog that is already open — StrictMode runs this effect twice
      // — or that is not in a document.
      if (!dialog.open && dialog.isConnected) {
        dialog.showModal();
      }
    } else if (dialog.open) {
      dialog.close();
    }
  }, [isOpen, browserCloses]);

  const handleCancel = (event: SyntheticEvent<HTMLDialogElement>) => {
    // Left alone, `Escape` closes the element before a controlled parent has had its say.
    event.preventDefault();
    requestClose();
  };

  const handleClose = (event: SyntheticEvent<HTMLDialogElement>) => {
    // A close this component asked for leaves `isOpen` false. A `close` event that arrives after
    // the element was shown again is stale: browsers dispatch it from a queued task, which can
    // run after a reopen.
    if (!isOpen || event.currentTarget.open) {
      return;
    }
    requestClose();
    setBrowserCloses((count) => count + 1);
  };

  const handleSubmit = (event: FormEvent<HTMLDialogElement>) => {
    const form = event.target as HTMLFormElement;
    // A form in a nested dialog closes that dialog, not this one, and a handler of the caller's
    // own that cancelled the submission cancelled the close with it.
    if (form.closest("dialog") !== event.currentTarget || event.nativeEvent.defaultPrevented) {
      return;
    }
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    // A submit button's `formmethod` overrides its form's `method`.
    const method = submitter?.getAttribute("formmethod") ?? form.getAttribute("method");
    if (method?.toLowerCase() !== "dialog") {
      return;
    }
    // A `method="dialog"` submission closes the element natively, with no `cancel` to stop it.
    event.preventDefault();
    requestClose();
  };

  const handleClick = (event: MouseEvent<HTMLDialogElement>) => {
    // The `<dialog>` has no padding of its own and the panel fills it, so a click whose target is
    // the `<dialog>` itself landed on the backdrop.
    if (closeOnBackdropClick && event.target === event.currentTarget) {
      requestClose();
    }
  };

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
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: a click on the dialog itself is a backdrop click, which a keyboard user makes with Escape through `onCancel` */}
      <dialog
        {...aria}
        ref={(node) => {
          dialogRef.current = node;
          // A caller's ref is a function, an object, or absent; forwarding it by hand is what lets
          // this component keep a ref of its own to the same element.
          if (typeof ref === "function") {
            ref(node);
          } else if (ref) {
            ref.current = node;
          }
        }}
        className={["vpg-dialog", className].filter(Boolean).join(" ")}
        data-vpg-overlay-root=""
        onCancel={handleCancel}
        onClose={handleClose}
        onSubmit={handleSubmit}
        onClick={handleClick}
      >
        <div className="vpg-dialog-panel">{children}</div>
      </dialog>
    </>
  );
}
