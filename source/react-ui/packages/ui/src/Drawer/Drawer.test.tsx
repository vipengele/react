import { act, fireEvent, render, screen } from "@testing-library/react";
import { createRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { Drawer } from "./Drawer.js";

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

/** A drawer whose `open` state lives in a parent that honours or ignores close requests. */
function Controlled({ veto, onOpenChange }: { veto: boolean; onOpenChange?: (open: boolean) => void }) {
  const [open, setOpen] = useState(true);
  return (
    <Drawer
      aria-label="Filters"
      open={open}
      onOpenChange={(next) => {
        onOpenChange?.(next);
        if (!veto) {
          setOpen(next);
        }
      }}
    >
      <p>Body</p>
    </Drawer>
  );
}

describe("Drawer", () => {
  it("renders a closed <dialog> wrapping one panel, with no open attribute from markup", () => {
    const { container } = render(
      <Drawer aria-label="Filters">
        <p>Body</p>
      </Drawer>,
    );
    const dialog = dialogElement(container);
    expect(dialog.open).toBe(false);
    expect(dialog).not.toHaveAttribute("open");
    expect(dialog).toHaveClass("vpg-drawer");
    expect(dialog.children).toHaveLength(1);
    expect(dialog.firstElementChild).toHaveClass("vpg-drawer-panel");
    expect(dialog.firstElementChild).toHaveTextContent("Body");
  });

  it("injects its stylesheet through React's hoisted <style>", () => {
    render(<Drawer aria-label="Filters">Body</Drawer>);
    expect(document.querySelector('style[data-href="vpg-drawer"]')).not.toBeNull();
  });

  it("marks the <dialog> as an overlay root", () => {
    const { container } = render(<Drawer aria-label="Filters">Body</Drawer>);
    expect(dialogElement(container)).toHaveAttribute("data-vpg-overlay-root", "");
  });

  it("composes className onto the <dialog>", () => {
    const { container } = render(
      <Drawer aria-label="Filters" className="wide">
        Body
      </Drawer>,
    );
    const dialog = dialogElement(container);
    expect(dialog).toHaveClass("vpg-drawer", "wide");
    expect(dialog.firstElementChild).not.toHaveClass("wide");
  });

  it("puts aria-label and aria-describedby on the <dialog>", () => {
    render(
      <Drawer aria-label="Filters" aria-describedby="hint" defaultOpen>
        <p id="hint">Narrow the results.</p>
      </Drawer>,
    );
    const dialog = screen.getByRole("dialog", { name: "Filters" });
    expect(dialog).toHaveAccessibleDescription("Narrow the results.");
  });

  it("names itself through aria-labelledby", () => {
    render(
      <Drawer aria-labelledby="title" defaultOpen>
        <h2 id="title">Filters</h2>
      </Drawer>,
    );
    expect(screen.getByRole("dialog", { name: "Filters" })).toBeInTheDocument();
  });

  it("has the dialog role by default", () => {
    render(
      <Drawer aria-label="Filters" defaultOpen>
        Body
      </Drawer>,
    );
    expect(screen.getByRole("dialog", { name: "Filters" })).toBeInTheDocument();
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("takes the alertdialog role when asked", () => {
    render(
      <Drawer aria-label="Discard changes" role="alertdialog" defaultOpen>
        Body
      </Drawer>,
    );
    expect(screen.getByRole("alertdialog", { name: "Discard changes" })).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("requires exactly one of aria-label and aria-labelledby", () => {
    const { container } = render(
      <>
        {/* @ts-expect-error A drawer with no accessible name is announced as a bare "dialog". */}
        <Drawer>Body</Drawer>
        {/* @ts-expect-error aria-labelledby takes precedence, so an aria-label beside it is never read. */}
        <Drawer aria-label="Filters" aria-labelledby="title">
          Body
        </Drawer>
      </>,
    );
    expect(container.querySelectorAll("dialog")).toHaveLength(2);
  });

  describe("side", () => {
    it("is anchored to the right by default", () => {
      const { container } = render(<Drawer aria-label="Filters">Body</Drawer>);
      expect(dialogElement(container)).toHaveAttribute("data-side", "right");
    });

    it.each(["left", "right", "top", "bottom"] as const)("anchors to the %s edge", (side) => {
      const { container } = render(
        <Drawer aria-label="Filters" side={side}>
          Body
        </Drawer>,
      );
      expect(dialogElement(container)).toHaveAttribute("data-side", side);
    });
  });

  describe("refs", () => {
    it("hands a function ref the <dialog>", () => {
      const ref = vi.fn();
      const { container } = render(
        <Drawer aria-label="Filters" ref={ref}>
          Body
        </Drawer>,
      );
      expect(ref).toHaveBeenCalledWith(dialogElement(container));
    });

    it("hands an object ref the <dialog>", () => {
      const ref = createRef<HTMLDialogElement>();
      const { container } = render(
        <Drawer aria-label="Filters" ref={ref}>
          Body
        </Drawer>,
      );
      expect(ref.current).toBe(dialogElement(container));
    });
  });

  describe("uncontrolled", () => {
    it("opens modally on mount with defaultOpen", () => {
      const showModal = vi.spyOn(HTMLDialogElement.prototype, "showModal");
      const { container } = render(
        <Drawer aria-label="Filters" defaultOpen>
          Body
        </Drawer>,
      );
      expect(dialogElement(container).open).toBe(true);
      expect(showModal).toHaveBeenCalledTimes(1);
      showModal.mockRestore();
    });

    it("closes itself on Escape and reports it", () => {
      const onOpenChange = vi.fn();
      const { container } = render(
        <Drawer aria-label="Filters" defaultOpen onOpenChange={onOpenChange}>
          Body
        </Drawer>,
      );
      const dialog = dialogElement(container);
      const cancel = pressEscape(dialog);
      expect(cancel.defaultPrevented).toBe(true);
      expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(false);
      expect(dialog.open).toBe(false);
    });

    it("closes itself on a backdrop click and reports it", () => {
      const onOpenChange = vi.fn();
      const { container } = render(
        <Drawer aria-label="Filters" defaultOpen onOpenChange={onOpenChange}>
          Body
        </Drawer>,
      );
      const dialog = dialogElement(container);
      fireEvent.click(dialog);
      expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(false);
      expect(dialog.open).toBe(false);
    });

    it("works with no onOpenChange", () => {
      const { container } = render(
        <Drawer aria-label="Filters" defaultOpen>
          Body
        </Drawer>,
      );
      const dialog = dialogElement(container);
      pressEscape(dialog);
      expect(dialog.open).toBe(false);
    });
  });

  describe("controlled", () => {
    it("opens and closes with the open prop", () => {
      const { container, rerender } = render(
        <Drawer aria-label="Filters" open={false}>
          Body
        </Drawer>,
      );
      const dialog = dialogElement(container);
      expect(dialog.open).toBe(false);

      rerender(
        <Drawer aria-label="Filters" open>
          Body
        </Drawer>,
      );
      expect(dialog.open).toBe(true);

      rerender(
        <Drawer aria-label="Filters" open={false}>
          Body
        </Drawer>,
      );
      expect(dialog.open).toBe(false);
    });

    it("ignores defaultOpen once open is supplied", () => {
      const { container } = render(
        <Drawer aria-label="Filters" open={false} defaultOpen>
          Body
        </Drawer>,
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
  });

  describe("backdrop click", () => {
    it("is not a click inside the panel", () => {
      const onOpenChange = vi.fn();
      render(
        <Drawer aria-label="Filters" defaultOpen onOpenChange={onOpenChange}>
          <button type="button">Inside</button>
        </Drawer>,
      );
      fireEvent.click(screen.getByRole("button", { name: "Inside" }));
      fireEvent.click(screen.getByText("Inside").parentElement as HTMLElement);
      expect(onOpenChange).not.toHaveBeenCalled();
    });

    it("requests nothing when backdrop clicks are turned off", () => {
      const onOpenChange = vi.fn();
      const { container } = render(
        <Drawer aria-label="Filters" defaultOpen closeOnBackdropClick={false} onOpenChange={onOpenChange}>
          Body
        </Drawer>,
      );
      const dialog = dialogElement(container);
      fireEvent.click(dialog);
      expect(onOpenChange).not.toHaveBeenCalled();
      expect(dialog.open).toBe(true);
    });

    it("still closes on Escape when backdrop clicks are turned off", () => {
      const onOpenChange = vi.fn();
      const { container } = render(
        <Drawer aria-label="Filters" defaultOpen closeOnBackdropClick={false} onOpenChange={onOpenChange}>
          Body
        </Drawer>,
      );
      pressEscape(dialogElement(container));
      expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(false);
    });
  });
});
