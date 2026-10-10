import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createRef, type ReactNode, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { Popover } from "../Popover/Popover.js";
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

/** The non-modal drawer's `<div>`, looked up by its marker: it is portaled out of the container
 * the test rendered into. */
function nonModalElement(): HTMLElement {
  const drawer = document.querySelector<HTMLElement>('.vpg-drawer[data-modal="false"]');
  if (drawer === null) {
    throw new Error("no non-modal drawer was rendered");
  }
  return drawer;
}

/** A non-modal drawer whose `open` state lives in a parent that honours or ignores close requests. */
function ControlledNonModal({ veto, onOpenChange }: { veto: boolean; onOpenChange?: (open: boolean) => void }) {
  const [open, setOpen] = useState(true);
  return (
    <Drawer
      modal={false}
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

describe("Drawer, non-modal", () => {
  it("renders nothing while closed", () => {
    const { container } = render(
      <Drawer modal={false} aria-label="Filters">
        Body
      </Drawer>,
    );
    expect(document.querySelector(".vpg-drawer")).toBeNull();
    expect(container.querySelector("dialog")).toBeNull();
  });

  it("renders a <div> wrapping one panel, with no overlay-root marker and no aria-modal", () => {
    render(
      <Drawer modal={false} aria-label="Filters" defaultOpen>
        <p>Body</p>
      </Drawer>,
    );
    const drawer = nonModalElement();
    expect(drawer.tagName).toBe("DIV");
    expect(drawer).toHaveClass("vpg-drawer");
    expect(drawer).toHaveAttribute("data-side", "right");
    expect(drawer).not.toHaveAttribute("data-vpg-overlay-root");
    expect(drawer).not.toHaveAttribute("aria-modal");
    expect(drawer.children).toHaveLength(1);
    expect(drawer.firstElementChild).toHaveClass("vpg-drawer-panel");
    expect(drawer.firstElementChild).toHaveTextContent("Body");
  });

  it.each(["left", "right", "top", "bottom"] as const)("anchors to the %s edge", (side) => {
    render(
      <Drawer modal={false} aria-label="Filters" side={side} defaultOpen>
        Body
      </Drawer>,
    );
    expect(nonModalElement()).toHaveAttribute("data-side", side);
  });

  it("has the dialog role by default", () => {
    render(
      <Drawer modal={false} aria-label="Filters" defaultOpen>
        Body
      </Drawer>,
    );
    expect(screen.getByRole("dialog", { name: "Filters" })).toBe(nonModalElement());
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("takes the alertdialog role when asked", () => {
    render(
      <Drawer modal={false} aria-label="Discard changes" role="alertdialog" defaultOpen>
        Body
      </Drawer>,
    );
    expect(screen.getByRole("alertdialog", { name: "Discard changes" })).toBe(nonModalElement());
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("is named by aria-labelledby and described by aria-describedby", () => {
    render(
      <Drawer modal={false} aria-labelledby="title" aria-describedby="hint" defaultOpen>
        <h2 id="title">Filters</h2>
        <p id="hint">Narrow the results.</p>
      </Drawer>,
    );
    const drawer = screen.getByRole("dialog", { name: "Filters" });
    expect(drawer).toHaveAccessibleDescription("Narrow the results.");
  });

  it("requires exactly one of aria-label and aria-labelledby", () => {
    render(
      <>
        {/* @ts-expect-error A drawer with no accessible name is announced as a bare "dialog". */}
        <Drawer modal={false} defaultOpen>
          Body
        </Drawer>
        {/* @ts-expect-error aria-labelledby takes precedence, so an aria-label beside it is never read. */}
        <Drawer modal={false} aria-label="Filters" aria-labelledby="title" defaultOpen>
          Body
        </Drawer>
      </>,
    );
    expect(document.querySelectorAll('.vpg-drawer[data-modal="false"]')).toHaveLength(2);
  });

  it("injects its stylesheet through React's hoisted <style>", () => {
    render(
      <Drawer modal={false} aria-label="Filters" defaultOpen>
        Body
      </Drawer>,
    );
    expect(document.querySelector('style[data-href="vpg-drawer"]')).not.toBeNull();
  });

  describe("placement", () => {
    it("portals into the nearest .vpg-root", () => {
      const { container } = render(
        <div className="vpg-root">
          <section>
            <Drawer modal={false} aria-label="Filters" defaultOpen>
              Body
            </Drawer>
          </section>
        </div>,
      );
      const root = container.querySelector(".vpg-root") as HTMLElement;
      expect(nonModalElement().parentElement).toBe(root);
    });

    it("renders inline beside its sentinel when no .vpg-root surrounds it", () => {
      const { container } = render(
        <section>
          <Drawer modal={false} aria-label="Filters" defaultOpen>
            Body
          </Drawer>
        </section>,
      );
      expect(nonModalElement().parentElement).toBe(container.querySelector("section"));
    });

    it("portals into the modal surface it is opened inside, not the page's .vpg-root", () => {
      const { container } = render(
        <div className="vpg-root">
          <Drawer aria-label="Outer" defaultOpen>
            <Drawer modal={false} aria-label="Inner" defaultOpen>
              Body
            </Drawer>
          </Drawer>
        </div>,
      );
      const outer = dialogElement(container);
      expect(nonModalElement().parentElement).toBe(outer);
    });

    it("does not mount its content until it is open", () => {
      const { rerender } = render(
        <div className="vpg-root">
          <Drawer modal={false} aria-label="Filters" open={false}>
            <button type="button">Inside</button>
          </Drawer>
        </div>,
      );
      expect(screen.queryByRole("button", { name: "Inside" })).toBeNull();

      rerender(
        <div className="vpg-root">
          <Drawer modal={false} aria-label="Filters" open>
            <button type="button">Inside</button>
          </Drawer>
        </div>,
      );
      expect(screen.getByRole("button", { name: "Inside" })).toBeInTheDocument();
    });
  });

  describe("refs and className", () => {
    it("composes className onto the <div>, not the panel", () => {
      render(
        <Drawer modal={false} aria-label="Filters" className="wide" defaultOpen>
          Body
        </Drawer>,
      );
      const drawer = nonModalElement();
      expect(drawer).toHaveClass("vpg-drawer", "wide");
      expect(drawer.firstElementChild).not.toHaveClass("wide");
    });

    it("hands a function ref the <div> and clears it on close", () => {
      const ref = vi.fn();
      const { rerender } = render(
        <Drawer modal={false} aria-label="Filters" ref={ref} open>
          Body
        </Drawer>,
      );
      expect(ref).toHaveBeenCalledWith(nonModalElement());

      rerender(
        <Drawer modal={false} aria-label="Filters" ref={ref} open={false}>
          Body
        </Drawer>,
      );
      expect(ref).toHaveBeenLastCalledWith(null);
    });

    it("hands an object ref the <div>", () => {
      const ref = createRef<HTMLDivElement>();
      render(
        <Drawer modal={false} aria-label="Filters" ref={ref} defaultOpen>
          Body
        </Drawer>,
      );
      expect(ref.current).toBe(nonModalElement());
    });

    it("accepts no ref at all", () => {
      render(
        <Drawer modal={false} aria-label="Filters" defaultOpen>
          Body
        </Drawer>,
      );
      expect(nonModalElement()).toBeInTheDocument();
    });
  });

  describe("uncontrolled", () => {
    it("opens on mount with defaultOpen", () => {
      render(
        <Drawer modal={false} aria-label="Filters" defaultOpen>
          Body
        </Drawer>,
      );
      expect(nonModalElement()).toBeInTheDocument();
    });

    it("closes itself on Escape and reports it", async () => {
      const onOpenChange = vi.fn();
      render(
        <Drawer modal={false} aria-label="Filters" defaultOpen onOpenChange={onOpenChange}>
          Body
        </Drawer>,
      );
      fireEvent.keyDown(document, { key: "Escape" });
      await waitFor(() => expect(document.querySelector(".vpg-drawer")).toBeNull());
      expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(false);
    });

    it("works with no onOpenChange", async () => {
      render(
        <Drawer modal={false} aria-label="Filters" defaultOpen>
          Body
        </Drawer>,
      );
      fireEvent.keyDown(document, { key: "Escape" });
      await waitFor(() => expect(document.querySelector(".vpg-drawer")).toBeNull());
    });
  });

  describe("controlled", () => {
    it("opens and closes with the open prop", () => {
      const { rerender } = render(
        <Drawer modal={false} aria-label="Filters" open={false}>
          Body
        </Drawer>,
      );
      expect(document.querySelector(".vpg-drawer")).toBeNull();

      rerender(
        <Drawer modal={false} aria-label="Filters" open>
          Body
        </Drawer>,
      );
      expect(nonModalElement()).toBeInTheDocument();

      rerender(
        <Drawer modal={false} aria-label="Filters" open={false}>
          Body
        </Drawer>,
      );
      expect(document.querySelector(".vpg-drawer")).toBeNull();
    });

    it("ignores defaultOpen once open is supplied", () => {
      render(
        <Drawer modal={false} aria-label="Filters" open={false} defaultOpen>
          Body
        </Drawer>,
      );
      expect(document.querySelector(".vpg-drawer")).toBeNull();
    });

    it("closes on Escape when the parent honours the request", async () => {
      const onOpenChange = vi.fn();
      render(<ControlledNonModal veto={false} onOpenChange={onOpenChange} />);
      fireEvent.keyDown(document, { key: "Escape" });
      await waitFor(() => expect(document.querySelector(".vpg-drawer")).toBeNull());
      expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(false);
    });

    it("stays open on Escape when the parent vetoes the request", async () => {
      const onOpenChange = vi.fn();
      render(<ControlledNonModal veto onOpenChange={onOpenChange} />);
      fireEvent.keyDown(document, { key: "Escape" });
      await waitFor(() => expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(false));
      expect(nonModalElement()).toBeInTheDocument();
    });
  });

  describe("Escape in the overlay tree", () => {
    it("closes an overlay opened from inside the drawer before the drawer itself", async () => {
      render(
        <div className="vpg-root">
          <Drawer modal={false} aria-label="Filters" defaultOpen>
            <Popover content={<p>Inner panel</p>} className="inner" defaultOpen>
              <button type="button">More</button>
            </Popover>
          </Drawer>
        </div>,
      );
      expect(document.querySelector(".vpg-popover.inner")).toBeInTheDocument();

      fireEvent.keyDown(document, { key: "Escape" });
      await waitFor(() => expect(document.querySelector(".vpg-popover.inner")).toBeNull());
      expect(nonModalElement()).toBeInTheDocument();

      fireEvent.keyDown(document, { key: "Escape" });
      await waitFor(() => expect(document.querySelector(".vpg-drawer")).toBeNull());
    });
  });

  describe("closeOnOutsideClick", () => {
    it("does not close on an outside press by default", () => {
      const onOpenChange = vi.fn();
      render(
        <Drawer modal={false} aria-label="Filters" defaultOpen onOpenChange={onOpenChange}>
          Body
        </Drawer>,
      );
      fireEvent.pointerDown(document.body);
      fireEvent.click(document.body);
      expect(onOpenChange).not.toHaveBeenCalled();
      expect(nonModalElement()).toBeInTheDocument();
    });

    it("closes on an outside press when on, and reports it", async () => {
      const onOpenChange = vi.fn();
      render(
        <Drawer modal={false} aria-label="Filters" closeOnOutsideClick defaultOpen onOpenChange={onOpenChange}>
          Body
        </Drawer>,
      );
      fireEvent.pointerDown(document.body);
      fireEvent.click(document.body);
      await waitFor(() => expect(document.querySelector(".vpg-drawer")).toBeNull());
      expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(false);
    });

    it("does not close on a press inside the drawer when on", () => {
      const onOpenChange = vi.fn();
      render(
        <Drawer modal={false} aria-label="Filters" closeOnOutsideClick defaultOpen onOpenChange={onOpenChange}>
          <button type="button">Inside</button>
        </Drawer>,
      );
      const inside = screen.getByRole("button", { name: "Inside" });
      fireEvent.pointerDown(inside);
      fireEvent.click(inside);
      expect(onOpenChange).not.toHaveBeenCalled();
      expect(nonModalElement()).toBeInTheDocument();
    });

    it("stays open on an outside press when the parent vetoes the request", async () => {
      const onOpenChange = vi.fn();
      render(
        <Drawer modal={false} aria-label="Filters" closeOnOutsideClick open onOpenChange={onOpenChange}>
          Body
        </Drawer>,
      );
      fireEvent.pointerDown(document.body);
      fireEvent.click(document.body);
      await waitFor(() => expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(false));
      expect(nonModalElement()).toBeInTheDocument();
    });
  });

  describe("focus", () => {
    /** An element outside the drawer that holds focus before the drawer opens. */
    function Page({ open, children }: { open: boolean; children?: ReactNode }) {
      return (
        <div className="vpg-root">
          <button type="button">Opener</button>
          <button type="button">Elsewhere</button>
          <Drawer modal={false} aria-label="Filters" open={open}>
            {children}
          </Drawer>
        </div>
      );
    }

    it("moves to the first focusable element on open", () => {
      const { rerender } = render(
        <Page open={false}>
          <p>Intro</p>
          <button type="button" disabled>
            Disabled
          </button>
          <button type="button" tabIndex={-1}>
            Skipped
          </button>
          <button type="button">First</button>
          <button type="button">Second</button>
        </Page>,
      );
      rerender(
        <Page open>
          <p>Intro</p>
          <button type="button" disabled>
            Disabled
          </button>
          <button type="button" tabIndex={-1}>
            Skipped
          </button>
          <button type="button">First</button>
          <button type="button">Second</button>
        </Page>,
      );
      expect(screen.getByRole("button", { name: "First" })).toHaveFocus();
    });

    it("moves to the drawer itself when it holds nothing focusable", () => {
      const { rerender } = render(<Page open={false}>Body</Page>);
      rerender(<Page open>Body</Page>);
      expect(nonModalElement()).toHaveFocus();
    });

    it("returns to the previously focused element on close", () => {
      const { rerender } = render(<Page open={false}>Body</Page>);
      const opener = screen.getByRole("button", { name: "Opener" });
      opener.focus();
      rerender(<Page open>Body</Page>);
      expect(nonModalElement()).toHaveFocus();

      rerender(<Page open={false}>Body</Page>);
      expect(opener).toHaveFocus();
    });

    it("returns focus from an element inside the drawer on close", () => {
      const { rerender } = render(
        <Page open={false}>
          <button type="button">Inside</button>
        </Page>,
      );
      const opener = screen.getByRole("button", { name: "Opener" });
      opener.focus();
      rerender(
        <Page open>
          <button type="button">Inside</button>
        </Page>,
      );
      expect(screen.getByRole("button", { name: "Inside" })).toHaveFocus();

      rerender(
        <Page open={false}>
          <button type="button">Inside</button>
        </Page>,
      );
      expect(opener).toHaveFocus();
    });

    it("leaves focus alone when the user has moved it onto the page", () => {
      const { rerender } = render(<Page open={false}>Body</Page>);
      const opener = screen.getByRole("button", { name: "Opener" });
      const elsewhere = screen.getByRole("button", { name: "Elsewhere" });
      opener.focus();
      rerender(<Page open>Body</Page>);
      elsewhere.focus();

      rerender(<Page open={false}>Body</Page>);
      expect(elsewhere).toHaveFocus();
    });

    it("does not restore focus to an element that has left the document", () => {
      const { rerender } = render(<Page open={false}>Body</Page>);
      const opener = screen.getByRole("button", { name: "Opener" });
      opener.focus();
      rerender(<Page open>Body</Page>);
      opener.remove();

      rerender(<Page open={false}>Body</Page>);
      expect(opener).not.toHaveFocus();
      expect(document.body).toHaveFocus();
    });

    it("has nothing to restore when focus was on the body at open", () => {
      const { rerender } = render(<Page open={false}>Body</Page>);
      rerender(<Page open>Body</Page>);
      expect(nonModalElement()).toHaveFocus();

      rerender(<Page open={false}>Body</Page>);
      expect(document.body).toHaveFocus();
    });
  });
});
