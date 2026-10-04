import { act, fireEvent, render, screen } from "@testing-library/react";
import { createRef, type ReactNode, StrictMode, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { Dialog } from "./Dialog.js";

/** The `<dialog>` element. Looked up by tag rather than by role: a closed dialog is `display:
 * none` in a real engine and so absent from the accessibility tree. */
function dialogElement(container: HTMLElement): HTMLDialogElement {
  const dialog = container.querySelector("dialog");
  if (dialog === null) {
    throw new Error("no <dialog> was rendered");
  }
  return dialog;
}

/** Dispatches the `cancel` event a browser raises on a modal dialog when `Escape` is pressed. */
function pressEscape(dialog: HTMLDialogElement): Event {
  const cancel = new Event("cancel", { cancelable: true });
  act(() => {
    dialog.dispatchEvent(cancel);
  });
  return cancel;
}

/** A dialog whose `open` state lives in a parent that honours or ignores close requests. */
function Controlled({ veto, onOpenChange, children }: { veto: boolean; onOpenChange?: (open: boolean) => void; children?: ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Reopen
      </button>
      <Dialog
        aria-label="Settings"
        open={open}
        onOpenChange={(next) => {
          onOpenChange?.(next);
          if (!veto) {
            setOpen(next);
          }
        }}
      >
        {children ?? <p>Body</p>}
      </Dialog>
    </>
  );
}

describe("Dialog", () => {
  it("renders a closed <dialog> wrapping one panel, with no open attribute from markup", () => {
    const { container } = render(
      <Dialog aria-label="Settings">
        <p>Body</p>
      </Dialog>,
    );
    const dialog = dialogElement(container);
    expect(dialog.open).toBe(false);
    expect(dialog).toHaveClass("vpg-dialog");
    expect(dialog).toHaveAttribute("data-vpg-overlay-root", "");
    expect(dialog.children).toHaveLength(1);
    expect(dialog.firstElementChild).toHaveClass("vpg-dialog-panel");
    expect(dialog.firstElementChild).toHaveTextContent("Body");
  });

  it("injects its stylesheet through React's hoisted <style>", () => {
    render(<Dialog aria-label="Settings">Body</Dialog>);
    expect(document.querySelector('style[data-href="vpg-dialog"]')).not.toBeNull();
  });

  it("composes className onto the <dialog>", () => {
    const { container } = render(
      <Dialog aria-label="Settings" className="wide">
        Body
      </Dialog>,
    );
    expect(dialogElement(container)).toHaveClass("vpg-dialog", "wide");
  });

  it("puts aria-label and aria-describedby on the <dialog>", () => {
    render(
      <Dialog aria-label="Settings" aria-describedby="hint" defaultOpen>
        <p id="hint">Changes save automatically.</p>
      </Dialog>,
    );
    const dialog = screen.getByRole("dialog", { name: "Settings" });
    expect(dialog).toHaveAccessibleDescription("Changes save automatically.");
  });

  it("names itself through aria-labelledby", () => {
    render(
      <Dialog aria-labelledby="title" defaultOpen>
        <h2 id="title">Delete draft</h2>
      </Dialog>,
    );
    expect(screen.getByRole("dialog", { name: "Delete draft" })).toBeInTheDocument();
  });

  it("requires exactly one of aria-label and aria-labelledby", () => {
    const { container } = render(
      <>
        {/* @ts-expect-error A dialog with no accessible name is announced as a bare "dialog". */}
        <Dialog>Body</Dialog>
        {/* @ts-expect-error aria-labelledby takes precedence, so an aria-label beside it is never read. */}
        <Dialog aria-label="Settings" aria-labelledby="title">
          Body
        </Dialog>
      </>,
    );
    expect(container.querySelectorAll("dialog")).toHaveLength(2);
  });

  it("hands a function ref the <dialog>", () => {
    const ref = vi.fn();
    const { container } = render(
      <Dialog aria-label="Settings" ref={ref}>
        Body
      </Dialog>,
    );
    expect(ref).toHaveBeenCalledWith(dialogElement(container));
  });

  it("hands an object ref the <dialog>", () => {
    const ref = createRef<HTMLDialogElement>();
    const { container } = render(
      <Dialog aria-label="Settings" ref={ref}>
        Body
      </Dialog>,
    );
    expect(ref.current).toBe(dialogElement(container));
  });

  describe("uncontrolled", () => {
    it("opens modally on mount with defaultOpen", () => {
      const showModal = vi.spyOn(HTMLDialogElement.prototype, "showModal");
      const { container } = render(
        <Dialog aria-label="Settings" defaultOpen>
          Body
        </Dialog>,
      );
      expect(dialogElement(container).open).toBe(true);
      expect(showModal).toHaveBeenCalledTimes(1);
      showModal.mockRestore();
    });

    it("closes itself on Escape and reports it", () => {
      const onOpenChange = vi.fn();
      const { container } = render(
        <Dialog aria-label="Settings" defaultOpen onOpenChange={onOpenChange}>
          Body
        </Dialog>,
      );
      const dialog = dialogElement(container);
      const cancel = pressEscape(dialog);
      expect(cancel.defaultPrevented).toBe(true);
      expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(false);
      expect(dialog.open).toBe(false);
    });

    it("closes itself on a backdrop click", () => {
      const { container } = render(
        <Dialog aria-label="Settings" defaultOpen>
          Body
        </Dialog>,
      );
      const dialog = dialogElement(container);
      fireEvent.click(dialog);
      expect(dialog.open).toBe(false);
    });

    it("reports a close the browser performs without being asked", () => {
      const onOpenChange = vi.fn();
      const { container } = render(
        <Dialog aria-label="Settings" defaultOpen onOpenChange={onOpenChange}>
          Body
        </Dialog>,
      );
      const dialog = dialogElement(container);
      act(() => dialog.close());
      expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(false);
      expect(dialog.open).toBe(false);
    });

    it("works with no onOpenChange", () => {
      const { container } = render(
        <Dialog aria-label="Settings" defaultOpen>
          Body
        </Dialog>,
      );
      const dialog = dialogElement(container);
      pressEscape(dialog);
      expect(dialog.open).toBe(false);
    });
  });

  describe("controlled", () => {
    it("opens and closes with the open prop", () => {
      const { container, rerender } = render(
        <Dialog aria-label="Settings" open={false}>
          Body
        </Dialog>,
      );
      const dialog = dialogElement(container);
      expect(dialog.open).toBe(false);

      rerender(
        <Dialog aria-label="Settings" open>
          Body
        </Dialog>,
      );
      expect(dialog.open).toBe(true);

      rerender(
        <Dialog aria-label="Settings" open={false}>
          Body
        </Dialog>,
      );
      expect(dialog.open).toBe(false);
    });

    it("ignores defaultOpen once open is supplied", () => {
      const { container } = render(
        <Dialog aria-label="Settings" open={false} defaultOpen>
          Body
        </Dialog>,
      );
      expect(dialogElement(container).open).toBe(false);
    });

    it("closes on Escape when the parent honours the request", () => {
      const onOpenChange = vi.fn();
      const { container } = render(<Controlled veto={false} onOpenChange={onOpenChange} />);
      const dialog = dialogElement(container);
      pressEscape(dialog);
      expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(false);
      expect(dialog.open).toBe(false);
    });

    it("stays open on Escape when the parent vetoes the request", () => {
      const onOpenChange = vi.fn();
      const { container } = render(<Controlled veto onOpenChange={onOpenChange} />);
      const dialog = dialogElement(container);
      const cancel = pressEscape(dialog);
      expect(cancel.defaultPrevented).toBe(true);
      expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(false);
      expect(dialog.open).toBe(true);
    });

    it("stays open on a backdrop click when the parent vetoes the request", () => {
      const onOpenChange = vi.fn();
      const { container } = render(<Controlled veto onOpenChange={onOpenChange} />);
      const dialog = dialogElement(container);
      fireEvent.click(dialog);
      expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(false);
      expect(dialog.open).toBe(true);
    });

    it("shows itself again after a close the browser forces while the parent still holds open", () => {
      const onOpenChange = vi.fn();
      const showModal = vi.spyOn(HTMLDialogElement.prototype, "showModal");
      const { container } = render(<Controlled veto onOpenChange={onOpenChange} />);
      const dialog = dialogElement(container);
      expect(showModal).toHaveBeenCalledTimes(1);

      act(() => dialog.close());
      expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(false);
      expect(showModal).toHaveBeenCalledTimes(2);
      expect(dialog.open).toBe(true);
      showModal.mockRestore();
    });

    it("stays closed after a close the browser forces when the parent honours it", () => {
      const onOpenChange = vi.fn();
      const { container } = render(<Controlled veto={false} onOpenChange={onOpenChange} />);
      const dialog = dialogElement(container);
      act(() => dialog.close());
      expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(false);
      expect(dialog.open).toBe(false);

      fireEvent.click(screen.getByRole("button", { name: "Reopen" }));
      expect(dialog.open).toBe(true);
    });

    it("does not report the close event of a close it performed itself", () => {
      const onOpenChange = vi.fn();
      const { container, rerender } = render(
        <Dialog aria-label="Settings" open onOpenChange={onOpenChange}>
          Body
        </Dialog>,
      );
      rerender(
        <Dialog aria-label="Settings" open={false} onOpenChange={onOpenChange}>
          Body
        </Dialog>,
      );
      expect(dialogElement(container).open).toBe(false);
      expect(onOpenChange).not.toHaveBeenCalled();
    });

    it("ignores a close event that arrives after the dialog was shown again", () => {
      const onOpenChange = vi.fn();
      const { container } = render(
        <Dialog aria-label="Settings" open onOpenChange={onOpenChange}>
          Body
        </Dialog>,
      );
      const dialog = dialogElement(container);
      act(() => {
        dialog.dispatchEvent(new Event("close"));
      });
      expect(onOpenChange).not.toHaveBeenCalled();
      expect(dialog.open).toBe(true);
    });
  });

  describe("backdrop click", () => {
    it("is not a click inside the panel", () => {
      const onOpenChange = vi.fn();
      render(
        <Dialog aria-label="Settings" defaultOpen onOpenChange={onOpenChange}>
          <button type="button">Inside</button>
        </Dialog>,
      );
      fireEvent.click(screen.getByRole("button", { name: "Inside" }));
      fireEvent.click(screen.getByText("Inside").parentElement as HTMLElement);
      expect(onOpenChange).not.toHaveBeenCalled();
    });

    it("requests nothing when backdrop clicks are turned off", () => {
      const onOpenChange = vi.fn();
      const { container } = render(
        <Dialog aria-label="Settings" defaultOpen closeOnBackdropClick={false} onOpenChange={onOpenChange}>
          Body
        </Dialog>,
      );
      const dialog = dialogElement(container);
      fireEvent.click(dialog);
      expect(onOpenChange).not.toHaveBeenCalled();
      expect(dialog.open).toBe(true);
    });

    it("still closes on Escape when backdrop clicks are turned off", () => {
      const onOpenChange = vi.fn();
      const { container } = render(
        <Dialog aria-label="Settings" defaultOpen closeOnBackdropClick={false} onOpenChange={onOpenChange}>
          Body
        </Dialog>,
      );
      pressEscape(dialogElement(container));
      expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(false);
    });
  });

  describe("form submission", () => {
    it('routes a method="dialog" submission through onOpenChange and prevents the native close', () => {
      const onOpenChange = vi.fn();
      const submits: SubmitEvent[] = [];
      render(
        <Controlled veto onOpenChange={onOpenChange}>
          <form method="dialog" onSubmit={(event) => submits.push(event.nativeEvent as SubmitEvent)}>
            <button type="submit">Done</button>
          </form>
        </Controlled>,
      );
      fireEvent.click(screen.getByRole("button", { name: "Done" }));
      expect(submits).toHaveLength(1);
      expect(submits[0]?.defaultPrevented).toBe(true);
      expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(false);
      expect(screen.getByRole("dialog")).toHaveProperty("open", true);
    });

    it("matches the method case-insensitively and closes an uncontrolled dialog", () => {
      const { container } = render(
        <Dialog aria-label="Settings" defaultOpen>
          <form method="DIALOG">
            <button type="submit">Done</button>
          </form>
        </Dialog>,
      );
      fireEvent.click(screen.getByRole("button", { name: "Done" }));
      expect(dialogElement(container).open).toBe(false);
    });

    it('routes a formmethod="dialog" submitter on a form of another method', () => {
      const onOpenChange = vi.fn();
      render(
        <Dialog aria-label="Settings" defaultOpen onOpenChange={onOpenChange}>
          <form method="post" action="/save">
            <button type="submit" formMethod="dialog">
              Cancel
            </button>
          </form>
        </Dialog>,
      );
      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
      expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(false);
    });

    it("leaves a submitter whose formmethod overrides a dialog form alone", () => {
      const onOpenChange = vi.fn();
      const { container } = render(
        <Dialog aria-label="Settings" defaultOpen onOpenChange={onOpenChange}>
          <form method="dialog">
            <button type="submit" formMethod="post">
              Save
            </button>
          </form>
        </Dialog>,
      );
      // Dispatched by hand: a real click would run jsdom's unimplemented POST navigation.
      const submit = new SubmitEvent("submit", {
        bubbles: true,
        cancelable: true,
        submitter: screen.getByRole("button", { name: "Save" }),
      });
      act(() => {
        container.querySelector("form")?.dispatchEvent(submit);
      });
      expect(submit.defaultPrevented).toBe(false);
      expect(onOpenChange).not.toHaveBeenCalled();
    });

    it("leaves a form with no method alone", () => {
      const onOpenChange = vi.fn();
      const { container } = render(
        <Dialog aria-label="Settings" defaultOpen onOpenChange={onOpenChange}>
          <form>
            <input name="q" />
          </form>
        </Dialog>,
      );
      const submit = new Event("submit", { bubbles: true, cancelable: true });
      act(() => {
        container.querySelector("form")?.dispatchEvent(submit);
      });
      expect(submit.defaultPrevented).toBe(false);
      expect(onOpenChange).not.toHaveBeenCalled();
    });

    it("routes a submission with no submitter by the form's method", () => {
      const onOpenChange = vi.fn();
      const { container } = render(
        <Dialog aria-label="Settings" defaultOpen onOpenChange={onOpenChange}>
          <form method="dialog">
            <input name="q" />
          </form>
        </Dialog>,
      );
      fireEvent.submit(container.querySelector("form") as HTMLFormElement);
      expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(false);
    });

    it("requests no close when the caller's own handler cancelled the submission", () => {
      const onOpenChange = vi.fn();
      render(
        <Dialog aria-label="Settings" defaultOpen onOpenChange={onOpenChange}>
          <form method="dialog" onSubmit={(event) => event.preventDefault()}>
            <button type="submit">Done</button>
          </form>
        </Dialog>,
      );
      fireEvent.click(screen.getByRole("button", { name: "Done" }));
      expect(onOpenChange).not.toHaveBeenCalled();
    });

    it("leaves a submission from a nested dialog's form to that dialog", () => {
      const outer = vi.fn();
      const inner = vi.fn();
      render(
        <Dialog aria-label="Outer" defaultOpen onOpenChange={outer}>
          <Dialog aria-label="Inner" defaultOpen onOpenChange={inner}>
            <form method="dialog">
              <button type="submit">Done</button>
            </form>
          </Dialog>
        </Dialog>,
      );
      fireEvent.click(screen.getByRole("button", { name: "Done" }));
      expect(inner).toHaveBeenCalledExactlyOnceWith(false);
      expect(outer).not.toHaveBeenCalled();
    });
  });

  describe("showModal guards", () => {
    it("calls showModal once under StrictMode's doubled effects", () => {
      const showModal = vi.spyOn(HTMLDialogElement.prototype, "showModal");
      const { container } = render(
        <StrictMode>
          <Dialog aria-label="Settings" defaultOpen>
            Body
          </Dialog>
        </StrictMode>,
      );
      expect(dialogElement(container).open).toBe(true);
      expect(showModal).toHaveBeenCalledTimes(1);
      showModal.mockRestore();
    });

    it("skips showModal on a dialog that is not in a document", () => {
      const showModal = vi.spyOn(HTMLDialogElement.prototype, "showModal");
      const detached = document.createElement("div");
      const { container } = render(
        <Dialog aria-label="Settings" defaultOpen>
          Body
        </Dialog>,
        { container: detached },
      );
      expect(dialogElement(container).isConnected).toBe(false);
      expect(showModal).not.toHaveBeenCalled();
      showModal.mockRestore();
    });
  });
});
