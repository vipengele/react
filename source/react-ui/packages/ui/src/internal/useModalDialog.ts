import {
  type FormEvent,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  type Ref,
  type SyntheticEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { type UseOverlayStateOptions, useOverlayState } from "./useOverlayState.js";

export interface UseModalDialogOptions extends UseOverlayStateOptions {
  /** Whether a click on the backdrop requests a close. */
  closeOnBackdropClick: boolean;
  /** The caller's ref to the `<dialog>` element, forwarded alongside the hook's own. */
  ref?: Ref<HTMLDialogElement>;
}

export interface ModalDialogProps {
  ref: (node: HTMLDialogElement | null) => void;
  onKeyDownCapture: (event: KeyboardEvent<HTMLDialogElement>) => void;
  onKeyUp: () => void;
  onCancel: (event: SyntheticEvent<HTMLDialogElement>) => void;
  onClose: (event: SyntheticEvent<HTMLDialogElement>) => void;
  onSubmit: (event: FormEvent<HTMLDialogElement>) => void;
  onClick: (event: MouseEvent<HTMLDialogElement>) => void;
}

export interface UseModalDialogReturn {
  /** Spread onto the `<dialog>`, which has to be rendered on every render. */
  dialogProps: ModalDialogProps;
  /** Wraps the `<dialog>` in its overlay-tree node. */
  node: (floating: ReactNode) => ReactNode;
}

/**
 * Drives a native `<dialog>` as a modal overlay: `showModal()` while the overlay state is open,
 * `close()` once it is not, and every way the element would close itself — `Escape`, a backdrop
 * click, a `method="dialog"` form submission — turned into a close request instead, so a
 * controlled parent that keeps `open` true vetoes it. A close the browser forces regardless — a
 * second `Escape` its close-watcher refuses to let `cancel` stop, or a caller's own `close()`
 * through the ref — is reported the same way and undone by a fresh `showModal()` when the parent
 * still holds `open`.
 *
 * The `open` attribute is never rendered on the `<dialog>`: set from markup it opens the dialog
 * non-modally, and `showModal()` then throws on an element that is already open.
 */
export function useModalDialog({
  open,
  defaultOpen,
  onOpenChange,
  closeOnBackdropClick,
  ref,
}: UseModalDialogOptions): UseModalDialogReturn {
  const { isOpen, requestClose, floatingRef, node } = useOverlayState({ open, defaultOpen, onOpenChange });
  // Bumped by every close the browser performs on its own. A controlled parent that keeps `open`
  // true re-renders with an unchanged `isOpen`, which alone would never re-run the effect below
  // to reopen the element.
  const [browserCloses, setBrowserCloses] = useState(0);
  const dialogRef = useRef<HTMLDialogElement>(null);
  // Set while an `Escape` keydown is in flight, which `useDismiss` has already handled.
  const escapeHandledByTree = useRef(false);

  // The dialog is the floating element, so a press inside it, its backdrop included, counts as
  // inside a non-modal overlay it was opened from. Registered from an effect rather than from
  // `setRef`, which is a new function on every render and so is detached and reattached each time.
  useEffect(() => {
    floatingRef(dialogRef.current);
  }, [floatingRef]);

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

  const handleKeyDownCapture = (event: KeyboardEvent<HTMLDialogElement>) => {
    if (event.key === "Escape") {
      escapeHandledByTree.current = true;
    }
  };

  const handleKeyUp = () => {
    // A `cancel` follows its `Escape` keydown, never its keyup, so a keydown whose `cancel` never
    // came (the page cancelled it) cannot swallow a later close request.
    escapeHandledByTree.current = false;
  };

  const handleCancel = (event: SyntheticEvent<HTMLDialogElement>) => {
    // Left alone, the browser closes the element before a controlled parent has had its say.
    event.preventDefault();
    // The `cancel` that an `Escape` keypress raises repeats a request `useDismiss` has already
    // made, or deliberately withheld because an overlay inside the dialog is still open. A
    // `cancel` with no such keypress behind it — a platform back gesture — has only this handler.
    if (escapeHandledByTree.current) {
      escapeHandledByTree.current = false;
      return;
    }
    requestClose();
  };

  const handleClose = (event: SyntheticEvent<HTMLDialogElement>) => {
    // A close this hook asked for leaves `isOpen` false. A `close` event that arrives after the
    // element was shown again is stale: browsers dispatch it from a queued task, which can run
    // after a reopen.
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
    // The `<dialog>` has no padding of its own and its content fills it, so a click whose target
    // is the `<dialog>` itself landed on the backdrop.
    if (closeOnBackdropClick && event.target === event.currentTarget) {
      requestClose();
    }
  };

  const setRef = (element: HTMLDialogElement | null) => {
    dialogRef.current = element;
    // A caller's ref is a function, an object, or absent; forwarding it by hand is what lets this
    // hook keep a ref of its own to the same element.
    if (typeof ref === "function") {
      ref(element);
    } else if (ref) {
      ref.current = element;
    }
  };

  return {
    dialogProps: {
      ref: setRef,
      onKeyDownCapture: handleKeyDownCapture,
      onKeyUp: handleKeyUp,
      onCancel: handleCancel,
      onClose: handleClose,
      onSubmit: handleSubmit,
      onClick: handleClick,
    },
    node,
  };
}
