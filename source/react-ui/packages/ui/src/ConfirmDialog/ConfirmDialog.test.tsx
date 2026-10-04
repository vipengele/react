import { act, fireEvent, render, screen } from "@testing-library/react";
import { createRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { ConfirmDialog, type ConfirmDialogProps } from "./ConfirmDialog.js";

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
function pressEscape(dialog: HTMLDialogElement) {
  act(() => {
    dialog.dispatchEvent(new Event("cancel", { cancelable: true }));
  });
}

/** A click whose target is the `<dialog>` itself, which is how a backdrop click arrives. */
function clickBackdrop(dialog: HTMLDialogElement) {
  fireEvent.click(dialog);
}

function button(name: string): HTMLButtonElement {
  return screen.getByRole("button", { name, hidden: true }) as HTMLButtonElement;
}

/** A promise whose settlement the test decides. */
function deferred() {
  let resolve!: () => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** Lets a settled promise's handlers run, inside `act` so their state updates are flushed. */
async function flush() {
  await act(async () => {});
}

/** A confirm dialog whose `open` state lives in a parent that honours every request. */
function Controlled(props: Omit<ConfirmDialogProps, "open" | "onOpenChange"> & { onOpenChange?: (open: boolean) => void }) {
  const [open, setOpen] = useState(true);
  return (
    <ConfirmDialog
      {...props}
      open={open}
      onOpenChange={(next) => {
        props.onOpenChange?.(next);
        setOpen(next);
      }}
    />
  );
}

describe("ConfirmDialog", () => {
  it("renders an alertdialog named by its title and described by its description", () => {
    const { container } = render(
      <ConfirmDialog defaultOpen title="Delete project?" description="This cannot be undone." onConfirm={() => {}} />,
    );
    const dialog = dialogElement(container);
    expect(dialog).toHaveAttribute("role", "alertdialog");
    expect(dialog.open).toBe(true);
    const title = screen.getByRole("heading", { name: "Delete project?", hidden: true });
    expect(title.tagName).toBe("H2");
    expect(title).toHaveClass("vpg-typography");
    expect(dialog).toHaveAttribute("aria-labelledby", title.id);
    const description = screen.getByText("This cannot be undone.");
    expect(dialog).toHaveAttribute("aria-describedby", description.id);
    expect(description.id).not.toBe(title.id);
  });

  it("omits aria-describedby when there is no description", () => {
    const { container } = render(<ConfirmDialog defaultOpen title="Leave?" onConfirm={() => {}} />);
    expect(dialogElement(container)).not.toHaveAttribute("aria-describedby");
  });

  it("is closed unless opened", () => {
    const { container } = render(<ConfirmDialog title="Leave?" onConfirm={() => {}} />);
    expect(dialogElement(container).open).toBe(false);
  });

  it("labels its buttons Confirm and Cancel by default", () => {
    render(<ConfirmDialog defaultOpen title="Leave?" onConfirm={() => {}} />);
    expect(button("Confirm")).toBeInTheDocument();
    expect(button("Cancel")).toBeInTheDocument();
  });

  it("takes overridden button labels", () => {
    render(<ConfirmDialog defaultOpen title="Leave?" confirmLabel="Leave" cancelLabel="Stay" onConfirm={() => {}} />);
    expect(button("Leave")).toBeInTheDocument();
    expect(button("Stay")).toBeInTheDocument();
  });

  it("draws a primary confirm button and gives it the initial focus by default", () => {
    render(<ConfirmDialog defaultOpen title="Leave?" onConfirm={() => {}} />);
    expect(button("Confirm")).toHaveClass("vpg-button-primary");
    expect(button("Cancel")).toHaveClass("vpg-button-secondary");
    expect(button("Confirm")).toHaveAttribute("autofocus");
    expect(button("Cancel")).not.toHaveAttribute("autofocus");
  });

  it("draws a danger confirm button and gives the cancel button the initial focus when tone is danger", () => {
    render(<ConfirmDialog defaultOpen tone="danger" title="Delete?" onConfirm={() => {}} />);
    expect(button("Confirm")).toHaveClass("vpg-button-danger");
    expect(button("Cancel")).toHaveAttribute("autofocus");
    expect(button("Confirm")).not.toHaveAttribute("autofocus");
  });

  it("moves the autofocus target when tone changes", () => {
    const { rerender } = render(<ConfirmDialog defaultOpen title="Delete?" onConfirm={() => {}} />);
    rerender(<ConfirmDialog defaultOpen tone="danger" title="Delete?" onConfirm={() => {}} />);
    expect(button("Cancel")).toHaveAttribute("autofocus");
    expect(button("Confirm")).not.toHaveAttribute("autofocus");
  });

  it("composes className and forwards ref to the <dialog>", () => {
    const ref = createRef<HTMLDialogElement>();
    const { container } = render(<ConfirmDialog defaultOpen title="Leave?" className="narrow" ref={ref} onConfirm={() => {}} />);
    const dialog = dialogElement(container);
    expect(dialog).toHaveClass("vpg-dialog", "narrow");
    expect(ref.current).toBe(dialog);
  });

  describe("closing", () => {
    it("closes on Cancel, Escape and a backdrop click, reporting each", () => {
      const onOpenChange = vi.fn();
      const { container } = render(<ConfirmDialog defaultOpen title="Leave?" onConfirm={() => {}} onOpenChange={onOpenChange} />);
      const dialog = dialogElement(container);

      fireEvent.click(button("Cancel"));
      expect(dialog.open).toBe(false);
      expect(onOpenChange).toHaveBeenLastCalledWith(false);

      const { container: second } = render(<ConfirmDialog defaultOpen title="Again?" onConfirm={() => {}} onOpenChange={onOpenChange} />);
      pressEscape(dialogElement(second));
      expect(dialogElement(second).open).toBe(false);

      const { container: third } = render(
        <ConfirmDialog defaultOpen title="Once more?" onConfirm={() => {}} onOpenChange={onOpenChange} />,
      );
      clickBackdrop(dialogElement(third));
      expect(dialogElement(third).open).toBe(false);
      expect(onOpenChange).toHaveBeenCalledTimes(3);
    });

    it("leaves a controlled dialog open when its parent ignores the request", () => {
      const onOpenChange = vi.fn();
      const { container } = render(<ConfirmDialog open title="Leave?" onConfirm={() => {}} onOpenChange={onOpenChange} />);
      fireEvent.click(button("Cancel"));
      expect(onOpenChange).toHaveBeenCalledWith(false);
      expect(dialogElement(container).open).toBe(true);
    });

    it("closes a controlled dialog when its parent honours the request", () => {
      const { container } = render(<Controlled title="Leave?" onConfirm={() => {}} />);
      fireEvent.click(button("Cancel"));
      expect(dialogElement(container).open).toBe(false);
    });
  });

  describe("a synchronous onConfirm", () => {
    it("closes right after it returns", () => {
      const calls: string[] = [];
      const onConfirm = vi.fn(() => {
        calls.push("confirm");
      });
      const onOpenChange = vi.fn(() => {
        calls.push("close");
      });
      const { container } = render(<ConfirmDialog defaultOpen title="Leave?" onConfirm={onConfirm} onOpenChange={onOpenChange} />);
      fireEvent.click(button("Confirm"));
      expect(calls).toEqual(["confirm", "close"]);
      expect(onOpenChange).toHaveBeenCalledWith(false);
      expect(dialogElement(container).open).toBe(false);
    });

    it("stays open and does not rethrow when it throws", () => {
      const onOpenChange = vi.fn();
      const onConfirm = vi.fn(() => {
        throw new Error("nope");
      });
      const { container } = render(<ConfirmDialog defaultOpen title="Leave?" onConfirm={onConfirm} onOpenChange={onOpenChange} />);
      expect(() => fireEvent.click(button("Confirm"))).not.toThrow();
      expect(onConfirm).toHaveBeenCalledTimes(1);
      expect(onOpenChange).not.toHaveBeenCalled();
      expect(dialogElement(container).open).toBe(true);
      expect(button("Confirm")).toBeEnabled();
      expect(button("Cancel")).toBeEnabled();

      fireEvent.click(button("Confirm"));
      expect(onConfirm).toHaveBeenCalledTimes(2);
    });
  });

  describe("an asynchronous onConfirm", () => {
    it("loads the confirm button and disables Cancel while pending, then closes on resolution", async () => {
      const { promise, resolve } = deferred();
      const onOpenChange = vi.fn();
      const { container } = render(<ConfirmDialog defaultOpen title="Leave?" onConfirm={() => promise} onOpenChange={onOpenChange} />);
      fireEvent.click(button("Confirm"));

      expect(button("Confirm")).toBeDisabled();
      expect(button("Confirm")).toHaveAttribute("aria-busy", "true");
      expect(button("Cancel")).toBeDisabled();
      expect(onOpenChange).not.toHaveBeenCalled();
      expect(dialogElement(container).open).toBe(true);

      resolve();
      await flush();
      expect(onOpenChange).toHaveBeenCalledWith(false);
      expect(dialogElement(container).open).toBe(false);
      expect(button("Confirm")).toBeEnabled();
      expect(button("Cancel")).toBeEnabled();
    });

    it("stays open and re-enables its buttons on rejection, without reporting a close", async () => {
      const { promise, reject } = deferred();
      const onOpenChange = vi.fn();
      const onConfirm = vi.fn(() => promise);
      const { container } = render(<ConfirmDialog defaultOpen title="Leave?" onConfirm={onConfirm} onOpenChange={onOpenChange} />);
      fireEvent.click(button("Confirm"));
      expect(button("Cancel")).toBeDisabled();

      reject(new Error("offline"));
      await flush();
      expect(onOpenChange).not.toHaveBeenCalled();
      expect(dialogElement(container).open).toBe(true);
      expect(button("Confirm")).toBeEnabled();
      expect(button("Confirm")).not.toHaveAttribute("aria-busy");
      expect(button("Cancel")).toBeEnabled();

      onConfirm.mockImplementation(() => Promise.resolve());
      fireEvent.click(button("Confirm"));
      await flush();
      expect(onConfirm).toHaveBeenCalledTimes(2);
      expect(dialogElement(container).open).toBe(false);
    });

    it("calls onConfirm once however many times Confirm is clicked while pending", async () => {
      const { promise, resolve } = deferred();
      const onConfirm = vi.fn(() => promise);
      render(<ConfirmDialog defaultOpen title="Leave?" onConfirm={onConfirm} />);
      const confirm = button("Confirm");
      // Two clicks dispatched in the same task, before React re-renders the button disabled.
      act(() => {
        confirm.click();
        confirm.click();
      });
      expect(onConfirm).toHaveBeenCalledTimes(1);
      resolve();
      await flush();
    });

    it("ignores Escape, a backdrop click and Cancel while pending, uncontrolled", async () => {
      const { promise, resolve } = deferred();
      const onOpenChange = vi.fn();
      const { container } = render(<ConfirmDialog defaultOpen title="Leave?" onConfirm={() => promise} onOpenChange={onOpenChange} />);
      const dialog = dialogElement(container);
      fireEvent.click(button("Confirm"));

      pressEscape(dialog);
      clickBackdrop(dialog);
      fireEvent.click(button("Cancel"));
      expect(onOpenChange).not.toHaveBeenCalled();
      expect(dialog.open).toBe(true);

      resolve();
      await flush();
      expect(onOpenChange).toHaveBeenCalledTimes(1);
      expect(dialog.open).toBe(false);
    });

    it("ignores Escape and a backdrop click while pending, controlled", async () => {
      const { promise, resolve } = deferred();
      const onOpenChange = vi.fn();
      const { container } = render(<Controlled title="Leave?" onConfirm={() => promise} onOpenChange={onOpenChange} />);
      const dialog = dialogElement(container);
      fireEvent.click(button("Confirm"));

      pressEscape(dialog);
      clickBackdrop(dialog);
      expect(onOpenChange).not.toHaveBeenCalled();
      expect(dialog.open).toBe(true);

      resolve();
      await flush();
      expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(false);
      expect(dialog.open).toBe(false);
    });

    it("reopens after a close the browser forces while pending", async () => {
      const { promise, resolve } = deferred();
      const onOpenChange = vi.fn();
      const { container } = render(<ConfirmDialog defaultOpen title="Leave?" onConfirm={() => promise} onOpenChange={onOpenChange} />);
      const dialog = dialogElement(container);
      fireEvent.click(button("Confirm"));

      act(() => {
        dialog.close();
      });
      expect(onOpenChange).not.toHaveBeenCalled();
      expect(dialog.open).toBe(true);

      resolve();
      await flush();
      expect(dialog.open).toBe(false);
    });

    it("does nothing when the promise settles after unmount", async () => {
      const resolved = deferred();
      const onOpenChange = vi.fn();
      const { unmount } = render(
        <ConfirmDialog defaultOpen title="Leave?" onConfirm={() => resolved.promise} onOpenChange={onOpenChange} />,
      );
      fireEvent.click(button("Confirm"));
      unmount();
      resolved.resolve();
      await flush();
      expect(onOpenChange).not.toHaveBeenCalled();

      const rejected = deferred();
      const second = render(<ConfirmDialog defaultOpen title="Leave?" onConfirm={() => rejected.promise} onOpenChange={onOpenChange} />);
      fireEvent.click(button("Confirm"));
      second.unmount();
      rejected.reject(new Error("offline"));
      await flush();
      expect(onOpenChange).not.toHaveBeenCalled();
    });
  });
});
