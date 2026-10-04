import { type ReactNode, type Ref, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { Button } from "../Button/Button.js";
import { Dialog } from "../Dialog/Dialog.js";
import { Inline } from "../Inline/Inline.js";
import { Stack } from "../Stack/Stack.js";
import { Typography } from "../Typography/Typography.js";

export type ConfirmDialogTone = "default" | "danger";

export interface ConfirmDialogProps {
  /** The question the dialog asks. It names the dialog for assistive technology. */
  title: ReactNode;
  /** Phrasing content that explains the consequence of confirming, announced after the title. */
  description?: ReactNode;
  /** The confirm button's label. */
  confirmLabel?: string;
  /** The cancel button's label. */
  cancelLabel?: string;
  /** `"danger"` draws the confirm button as a destructive action and gives the initial focus to
   * the cancel button, so a stray `Enter` does not destroy anything. */
  tone?: ConfirmDialogTone;
  /** Called when the confirm button is activated. A returned promise holds the dialog open, with
   * the confirm button loading and every close request ignored, until it settles: it closes on
   * resolution and stays open, ready to retry, on rejection. A synchronous throw also leaves it
   * open. The dialog never rethrows either, so `onConfirm` reports its own errors. */
  // biome-ignore lint/suspicious/noConfusingVoidType: `void` lets any synchronous handler through, where `undefined` would refuse one whose own return type is `void`
  onConfirm: () => void | Promise<unknown>;
  /** Controls the dialog. Supplying it hands the state to the caller: the dialog then opens and
   * closes only when this prop changes, and reports every request through `onOpenChange`. */
  open?: boolean;
  /** Seeds the uncontrolled state. Ignored once `open` is supplied. */
  defaultOpen?: boolean;
  /** Fired for every close request the dialog honours — `Escape`, a backdrop click, the cancel
   * button, a confirmation that completed — in both the controlled and the uncontrolled form. */
  onOpenChange?: (open: boolean) => void;
  /** Composed onto the `<dialog>`. */
  className?: string;
  /** A ref to the `<dialog>` element itself. */
  ref?: Ref<HTMLDialogElement>;
}

/**
 * A `Dialog` that asks one question and offers two answers. It renders as an `alertdialog`, named
 * by its title and described by its description.
 *
 * It always controls the `Dialog` it composes and keeps the open state itself, in its uncontrolled
 * form as much as its controlled one: an uncontrolled `Dialog` closes itself before reporting the
 * request, which would leave no way to refuse a close while a confirmation is pending.
 */
export function ConfirmDialog({
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "default",
  onConfirm,
  open,
  defaultOpen = false,
  onOpenChange,
  className,
  ref,
}: ConfirmDialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const isOpen = open ?? uncontrolledOpen;
  const [pending, setPending] = useState(false);
  // Read synchronously by the click handler: a second click lands before the re-render that
  // disables the button, and would otherwise call `onConfirm` twice.
  const pendingRef = useRef(false);
  // A promise that settles after unmount must not set state or report a close.
  const mountedRef = useRef(false);
  const footerRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // `showModal()` focuses the element carrying the `autofocus` attribute, on the first open and on
  // the reopen that follows a close the browser forces. React never renders that attribute — its
  // `autoFocus` prop calls `focus()` once on mount, while the `<dialog>` is still closed — so it is
  // set on the DOM here. This layout effect runs before the `Dialog`'s own passive effect opens it.
  useLayoutEffect(() => {
    // The footer always renders, holding the cancel button and then the confirm button.
    const [cancelButton, confirmButton] = (footerRef.current as HTMLDivElement).querySelectorAll("button") as unknown as [
      HTMLButtonElement,
      HTMLButtonElement,
    ];
    cancelButton.toggleAttribute("autofocus", tone === "danger");
    confirmButton.toggleAttribute("autofocus", tone !== "danger");
  }, [tone]);

  const close = () => {
    // The internal state is kept only while `open` is absent, as `Dialog` keeps its own.
    if (open === undefined) {
      setUncontrolledOpen(false);
    }
    onOpenChange?.(false);
  };

  // `Dialog` only ever requests a close. Every request is refused while a confirmation is pending.
  const handleCloseRequest = () => {
    if (!pendingRef.current) {
      close();
    }
  };

  const settle = () => {
    pendingRef.current = false;
    setPending(false);
  };

  const handleConfirm = () => {
    if (pendingRef.current) {
      return;
    }
    let result: unknown;
    try {
      result = onConfirm();
    } catch {
      return;
    }
    if (!(result instanceof Promise)) {
      close();
      return;
    }
    pendingRef.current = true;
    setPending(true);
    result.then(
      () => {
        if (mountedRef.current) {
          settle();
          close();
        }
      },
      () => {
        if (mountedRef.current) {
          settle();
        }
      },
    );
  };

  return (
    <Dialog
      role="alertdialog"
      aria-labelledby={titleId}
      aria-describedby={description === undefined ? undefined : descriptionId}
      open={isOpen}
      onOpenChange={handleCloseRequest}
      className={className}
      ref={ref}
    >
      <Stack gap="space-4">
        <Stack gap="space-2">
          <Typography variant="h3" as="h2" id={titleId}>
            {title}
          </Typography>
          {description === undefined ? null : (
            <Typography color="secondary" id={descriptionId}>
              {description}
            </Typography>
          )}
        </Stack>
        <Inline ref={footerRef} gap="space-3" justify="end">
          <Button variant="secondary" disabled={pending} onClick={handleCloseRequest}>
            {cancelLabel}
          </Button>
          <Button variant={tone === "danger" ? "danger" : "primary"} loading={pending} onClick={handleConfirm}>
            {confirmLabel}
          </Button>
        </Inline>
      </Stack>
    </Dialog>
  );
}
