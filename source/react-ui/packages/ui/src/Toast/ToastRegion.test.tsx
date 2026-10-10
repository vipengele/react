import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, type MockInstance, vi } from "vitest";
import { type ToastPlacement, ToastRegion } from "./ToastRegion.js";
import { createToaster, peekDefaultToaster, type Toaster, type ToastTone, toast } from "./toaster.js";

let warn: MockInstance<typeof console.warn>;

beforeEach(() => {
  warn = vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  for (const node of inserted.splice(0)) node.parentNode?.removeChild(node);
});

/** The popover the region renders, looked up by its class: jsdom exposes no top layer to query. */
function popoverElement(): HTMLElement {
  const popover = document.querySelector<HTMLElement>(".vpg-toast-region");
  if (popover === null) {
    throw new Error("no toast region popover was rendered");
  }
  return popover;
}

/** The element the popover and the announcer render into. */
function hostElement(): HTMLElement {
  const host = popoverElement().parentElement;
  if (host === null) {
    throw new Error("the toast region popover has no host");
  }
  return host;
}

const inserted: Node[] = [];

/** Appends `node` to the document and lets the mutation observers run. */
async function insert(node: Node) {
  inserted.push(node);
  await act(async () => {
    document.body.append(node);
  });
}

/** A `<dialog>` carrying the overlay-root marker, as `Dialog` and a modal `Drawer` render it. */
function surface(open: boolean): HTMLDialogElement {
  const element = document.createElement("dialog");
  element.setAttribute("data-vpg-overlay-root", "");
  element.open = open;
  return element;
}

function region(): HTMLElement {
  return screen.getByRole("region", { name: "Notifications (F8)" });
}

function announcer(): HTMLElement {
  const element = document.querySelector<HTMLElement>(".vpg-toast-announcer");
  if (element === null) {
    throw new Error("no announcer was rendered");
  }
  return element;
}

function toastItems(): HTMLElement[] {
  return within(region()).queryAllByRole("listitem");
}

function messages(): string[] {
  return toastItems().map((item) => item.querySelector(".vpg-toast-message")?.textContent ?? "");
}

function mount(toaster: Toaster, placement?: ToastPlacement) {
  return render(
    <div className="vpg-root">
      <ToastRegion toaster={toaster} placement={placement} />
    </div>,
  );
}

describe("ToastRegion", () => {
  describe("structure", () => {
    it("renders a manual popover holding a labelled region with an ordered list", () => {
      mount(createToaster());
      const popover = popoverElement();
      expect(popover).toHaveAttribute("popover", "manual");
      expect(popover).toContainElement(region());
      expect(region().tagName).toBe("SECTION");
      expect(region().querySelector("ol.vpg-toast-list")).not.toBeNull();
    });

    it("names the hotkey in the region's label", () => {
      render(<ToastRegion toaster={createToaster()} hotkey="Alt+T" />);
      expect(screen.getByRole("region", { name: "Notifications (Alt+T)" })).toBeInTheDocument();
    });

    it("injects its stylesheet", () => {
      mount(createToaster());
      expect(document.querySelector('style[data-href="vpg-toast"]')).not.toBeNull();
    });

    it("places the popover at the bottom end by default", () => {
      mount(createToaster());
      expect(popoverElement()).toHaveAttribute("data-placement", "bottom-end");
    });

    it.each<ToastPlacement>(["top-start", "top-center", "top-end", "bottom-start", "bottom-center", "bottom-end"])(
      "carries placement %s as a data attribute",
      (placement) => {
        mount(createToaster(), placement);
        expect(popoverElement()).toHaveAttribute("data-placement", placement);
      },
    );
  });

  describe("host", () => {
    it("renders the popover and the announcer side by side in one display: contents host", () => {
      mount(createToaster());
      const host = hostElement();
      expect(host).toHaveClass("vpg-toast-host");
      expect(announcer().parentElement).toBe(host);
      expect(announcer().nextElementSibling).toBe(popoverElement());
      expect(document.querySelector("style[data-href='vpg-toast']")?.textContent).toMatch(/\.vpg-toast-host \{\s*display: contents;/);
    });

    it("puts the host in the nearest .vpg-root", () => {
      const { container } = render(
        <div className="vpg-root">
          <section>
            <ToastRegion toaster={createToaster()} />
          </section>
        </div>,
      );
      expect(hostElement().parentElement).toBe(container.querySelector(".vpg-root"));
    });

    it("puts the host directly after its sentinel when no .vpg-root surrounds it", () => {
      render(
        <section data-testid="host">
          <ToastRegion toaster={createToaster()} />
        </section>,
      );
      const host = hostElement();
      expect(host.parentElement).toBe(screen.getByTestId("host"));
      expect(host.previousElementSibling).toHaveAttribute("hidden");
    });

    it("puts the host in the modal surface it is declared inside", () => {
      render(
        <div className="vpg-root">
          <div data-vpg-overlay-root="" data-testid="surface">
            <ToastRegion toaster={createToaster()} />
          </div>
        </div>,
      );
      expect(hostElement().parentElement).toBe(screen.getByTestId("surface"));
    });

    it("removes the host when the region unmounts", () => {
      const { unmount } = mount(createToaster());
      const host = hostElement();
      unmount();
      expect(host.isConnected).toBe(false);
    });
  });

  describe("popover", () => {
    it("shows the popover once it mounts and hides it on unmount", () => {
      const show = vi.spyOn(HTMLElement.prototype, "showPopover");
      const hide = vi.spyOn(HTMLElement.prototype, "hidePopover");
      const { unmount } = mount(createToaster());
      const popover = popoverElement();
      expect(show).toHaveBeenCalledTimes(1);
      expect(show.mock.contexts[0]).toBe(popover);
      expect(hide).not.toHaveBeenCalled();
      unmount();
      expect(hide).toHaveBeenCalledTimes(1);
      expect(hide.mock.contexts[0]).toBe(popover);
    });

    it("renders and moves without throwing in an engine that lacks the Popover API", async () => {
      const show = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "showPopover") as PropertyDescriptor;
      Object.defineProperty(HTMLElement.prototype, "showPopover", { value: undefined, configurable: true });
      const dialog = surface(false);
      try {
        const toaster = createToaster();
        const { unmount } = mount(toaster);
        act(() => {
          toaster.toast("Saved");
        });
        expect(popoverElement().querySelector(".vpg-toast-message")).toHaveTextContent("Saved");
        await insert(dialog);
        await act(async () => {
          dialog.showModal();
        });
        expect(hostElement().parentElement).toBe(dialog);
        unmount();
      } finally {
        Object.defineProperty(HTMLElement.prototype, "showPopover", show);
      }
    });
  });

  describe("modal surfaces", () => {
    /** Mounts a region and spies on its popover's show and hide from then on, so the initial show
     * is not counted. */
    function mounted() {
      const view = mount(createToaster());
      const popover = popoverElement();
      const root = view.container.querySelector(".vpg-root") as HTMLElement;
      return { ...view, root, popover, show: vi.spyOn(popover, "showPopover"), hide: vi.spyOn(popover, "hidePopover") };
    }

    async function open(dialog: HTMLDialogElement) {
      await act(async () => {
        dialog.showModal();
      });
    }

    async function close(dialog: HTMLDialogElement) {
      await act(async () => {
        dialog.close();
      });
    }

    it("moves the host into a modal surface when it opens, and hides and shows the popover again", async () => {
      const { popover, show, hide } = mounted();
      const dialog = surface(false);
      await insert(dialog);
      expect(show).not.toHaveBeenCalled();
      await open(dialog);
      expect(hostElement().parentElement).toBe(dialog);
      expect(hide).toHaveBeenCalledTimes(1);
      expect(show).toHaveBeenCalledTimes(1);
      expect(hide.mock.invocationCallOrder[0]).toBeLessThan(show.mock.invocationCallOrder[0] as number);
      expect(show.mock.contexts[0]).toBe(popover);
    });

    it("moves the host back to its overlay root when the surface closes", async () => {
      const { root, show } = mounted();
      const dialog = surface(false);
      await insert(dialog);
      await open(dialog);
      await close(dialog);
      expect(hostElement().parentElement).toBe(root);
      expect(show).toHaveBeenCalledTimes(2);
    });

    it("moves the host back after its sentinel when the region has no overlay root", async () => {
      render(
        <section data-testid="host">
          <ToastRegion toaster={createToaster()} />
        </section>,
      );
      const dialog = surface(false);
      await insert(dialog);
      await open(dialog);
      expect(hostElement().parentElement).toBe(dialog);
      await close(dialog);
      expect(hostElement().parentElement).toBe(screen.getByTestId("host"));
      expect(hostElement().previousElementSibling).toHaveAttribute("hidden");
    });

    it("keeps the popover's nodes across a move", async () => {
      const toaster = createToaster();
      mount(toaster);
      act(() => {
        toaster.toast("Saved");
      });
      const [item] = toastItems();
      const live = announcer().firstElementChild;
      const dialog = surface(false);
      await insert(dialog);
      await open(dialog);
      expect(toastItems()[0]).toBe(item);
      expect(announcer().firstElementChild).toBe(live);
    });

    it("follows the surface opened last and returns down the stack as each closes", async () => {
      const { root } = mounted();
      const outer = surface(false);
      const inner = surface(false);
      outer.append(inner);
      await insert(outer);
      await open(outer);
      expect(hostElement().parentElement).toBe(outer);
      await open(inner);
      expect(hostElement().parentElement).toBe(inner);
      await close(inner);
      expect(hostElement().parentElement).toBe(outer);
      await close(outer);
      expect(hostElement().parentElement).toBe(root);
    });

    it("orders surfaces by when they opened, not where they sit in the document", async () => {
      mounted();
      const first = surface(false);
      const second = surface(false);
      await insert(first);
      await insert(second);
      await open(second);
      await open(first);
      expect(hostElement().parentElement).toBe(first);
      await close(first);
      expect(hostElement().parentElement).toBe(second);
    });

    it("puts a surface opened again on top", async () => {
      mounted();
      const first = surface(false);
      const second = surface(false);
      await insert(first);
      await insert(second);
      await act(async () => {
        first.showModal();
        second.showModal();
        first.close();
        first.showModal();
      });
      expect(hostElement().parentElement).toBe(first);
    });

    it("stays put, without showing again, when a surface below the topmost closes", async () => {
      const outer = surface(false);
      const inner = surface(false);
      await insert(outer);
      await insert(inner);
      const { show } = mounted();
      await open(outer);
      await open(inner);
      expect(show).toHaveBeenCalledTimes(2);
      await close(outer);
      expect(hostElement().parentElement).toBe(inner);
      expect(show).toHaveBeenCalledTimes(2);
    });

    it("starts in a surface already open when it mounts, taking the last in document order", async () => {
      const first = surface(false);
      const second = surface(false);
      await insert(first);
      await insert(second);
      await open(second);
      await open(first);
      mount(createToaster());
      expect(hostElement().parentElement).toBe(second);
    });

    it("moves into a surface inserted already open, or held open in an inserted subtree", async () => {
      mounted();
      const bare = surface(true);
      await insert(bare);
      expect(hostElement().parentElement).toBe(bare);
      const wrapper = document.createElement("section");
      const held = surface(true);
      wrapper.append(held);
      await insert(wrapper);
      expect(hostElement().parentElement).toBe(held);
    });

    it("moves the host out of a surface removed from the document with the host inside it", async () => {
      const { root, show } = mounted();
      const dialog = surface(false);
      await insert(dialog);
      await open(dialog);
      await act(async () => {
        dialog.remove();
      });
      expect(hostElement().parentElement).toBe(root);
      expect(show).toHaveBeenCalledTimes(2);
    });

    it("ignores unrelated content, unmarked dialogs and an open surface's attribute rewritten", async () => {
      const dialog = surface(false);
      await insert(dialog);
      const { root, show, hide } = mounted();
      await open(dialog);
      show.mockClear();
      hide.mockClear();
      await act(async () => {
        dialog.setAttribute("open", "again");
      });
      await insert(document.createTextNode("text"));
      await insert(document.createElement("aside"));
      const details = document.createElement("details");
      await insert(details);
      await act(async () => {
        details.open = true;
      });
      const unmarked = document.createElement("dialog");
      await insert(unmarked);
      await act(async () => {
        unmarked.showModal();
      });
      expect(hostElement().parentElement).toBe(dialog);
      expect(show).not.toHaveBeenCalled();
      expect(hide).not.toHaveBeenCalled();
      expect(root).not.toContainElement(hostElement());
    });

    it("moves the host with moveBefore between two places in the document, where the engine has it", async () => {
      const moveBefore = vi.fn(function (this: Element, node: Node, child: Node | null) {
        this.insertBefore(node, child);
      });
      Object.defineProperty(Element.prototype, "moveBefore", { value: moveBefore, configurable: true });
      try {
        const { root } = mounted();
        const dialog = surface(false);
        await insert(dialog);
        await open(dialog);
        expect(moveBefore).toHaveBeenCalledTimes(1);
        expect(moveBefore.mock.contexts[0]).toBe(dialog);
        expect(moveBefore.mock.calls[0]).toEqual([hostElement(), null]);
        await act(async () => {
          dialog.remove();
        });
        expect(moveBefore).toHaveBeenCalledTimes(1);
        expect(hostElement().parentElement).toBe(root);
      } finally {
        Reflect.deleteProperty(Element.prototype, "moveBefore");
      }
    });

    it("stops watching once the region unmounts", async () => {
      const { unmount, show } = mounted();
      unmount();
      await insert(surface(true));
      expect(show).not.toHaveBeenCalled();
    });

    it("places the host once and never moves it in an engine that lacks MutationObserver", async () => {
      vi.stubGlobal("MutationObserver", undefined);
      try {
        const { root, show } = mounted();
        expect(hostElement().parentElement).toBe(root);
        await insert(surface(true));
        expect(hostElement().parentElement).toBe(root);
        expect(show).not.toHaveBeenCalled();
      } finally {
        vi.unstubAllGlobals();
      }
    });
  });

  describe("toasts", () => {
    it("renders a toast's message and description", () => {
      const toaster = createToaster();
      mount(toaster);
      act(() => {
        toaster.toast("Saved", { description: "Your changes are live." });
      });
      const [item] = toastItems();
      expect(item?.querySelector(".vpg-toast-message")).toHaveTextContent("Saved");
      expect(item?.querySelector(".vpg-toast-description")).toHaveTextContent("Your changes are live.");
    });

    it("renders no description element when the toast has none", () => {
      const toaster = createToaster();
      mount(toaster);
      act(() => {
        toaster.toast("Saved");
      });
      expect(toastItems()[0]?.querySelector(".vpg-toast-description")).toBeNull();
    });

    it.each<[ToastTone, boolean]>([
      ["neutral", false],
      ["success", true],
      ["warning", true],
      ["info", true],
      ["danger", true],
    ])("classes a %s toast by its tone and draws a glyph: %s", (tone, hasGlyph) => {
      const toaster = createToaster();
      mount(toaster);
      act(() => {
        toaster.toast("Message", { tone });
      });
      const [item] = toastItems();
      expect(item).toHaveClass("vpg-toast", `vpg-toast-${tone}`);
      expect(item).toHaveAttribute("data-tone", tone);
      const glyph = item?.querySelector(".vpg-toast-icon");
      expect(glyph !== null && glyph !== undefined).toBe(hasGlyph);
      if (hasGlyph) {
        expect(glyph).toHaveAttribute("aria-hidden", "true");
      }
    });

    it("dismisses a toast from its dismiss button", () => {
      const toaster = createToaster();
      mount(toaster);
      act(() => {
        toaster.toast("First");
        toaster.toast("Second");
      });
      const [first] = toastItems();
      fireEvent.click(within(first as HTMLElement).getByRole("button", { name: "Dismiss notification" }));
      expect(messages()).toEqual(["Second"]);
    });

    it("calls the action's handler and then dismisses the toast", () => {
      const toaster = createToaster();
      const onAction = vi.fn(() => {
        expect(messages()).toEqual(["Deleted"]);
      });
      mount(toaster);
      act(() => {
        toaster.toast("Deleted", { action: { label: "Undo", onAction } });
      });
      fireEvent.click(within(region()).getByRole("button", { name: "Undo" }));
      expect(onAction).toHaveBeenCalledTimes(1);
      expect(toastItems()).toHaveLength(0);
    });

    it("renders no action button when the toast has none", () => {
      const toaster = createToaster();
      mount(toaster);
      act(() => {
        toaster.toast("Saved");
      });
      expect(within(region()).getAllByRole("button")).toHaveLength(1);
    });

    it("renders at most three toasts and none of the queue", () => {
      const toaster = createToaster();
      mount(toaster);
      act(() => {
        for (const message of ["One", "Two", "Three", "Four", "Five"]) toaster.toast(message);
      });
      expect(messages()).toEqual(["One", "Two", "Three"]);
      act(() => {
        toaster.toast.dismiss(toaster.store.getSnapshot().visible[0]?.id);
      });
      expect(messages()).toEqual(["Two", "Three", "Four"]);
    });

    it("orders toasts oldest first at the bottom, so the newest sits nearest the bottom edge", () => {
      const toaster = createToaster();
      mount(toaster, "bottom-start");
      act(() => {
        toaster.toast("Older");
        toaster.toast("Newer");
      });
      expect(messages()).toEqual(["Older", "Newer"]);
    });

    it("orders toasts newest first at the top, so the newest sits nearest the top edge", () => {
      const toaster = createToaster();
      mount(toaster, "top-center");
      act(() => {
        toaster.toast("Older");
        toaster.toast("Newer");
      });
      expect(messages()).toEqual(["Newer", "Older"]);
    });
  });

  describe("announcer", () => {
    it("is the one live region, polite and not atomic, outside the popover", () => {
      mount(createToaster());
      const live = document.querySelectorAll("[aria-live]");
      expect(live).toHaveLength(1);
      expect(live[0]).toBe(announcer());
      expect(announcer()).toHaveAttribute("aria-live", "polite");
      expect(announcer()).toHaveAttribute("aria-atomic", "false");
      expect(popoverElement()).not.toContainElement(announcer());
    });

    it("puts no live region or status role inside the popover", () => {
      const toaster = createToaster();
      mount(toaster);
      act(() => {
        toaster.toast.danger("Failed", { description: "Try again." });
        toaster.toast.success("Saved");
      });
      const popover = popoverElement();
      expect(popover.querySelector("[aria-live], [role='alert'], [role='status'], [role='log']")).toBeNull();
    });

    it("holds the message and description of each visible toast", () => {
      const toaster = createToaster();
      mount(toaster);
      act(() => {
        toaster.toast("Saved", { description: "Your changes are live." });
        toaster.toast("Copied");
      });
      expect([...announcer().children].map((child) => child.textContent)).toEqual(["Saved Your changes are live.", "Copied"]);
    });

    it("keeps an announced toast's node when another toast arrives, so it is not read again", () => {
      const toaster = createToaster();
      mount(toaster);
      act(() => {
        toaster.toast("Saved");
      });
      const first = announcer().firstElementChild;
      act(() => {
        toaster.toast("Copied");
      });
      expect(announcer().firstElementChild).toBe(first);
    });
  });

  describe("store wiring", () => {
    it("registers with its toaster while mounted and unregisters on unmount", () => {
      const toaster = createToaster();
      const { unmount } = mount(toaster);
      act(() => {
        toaster.toast("Shown");
      });
      expect(toaster.store.getSnapshot().visible).toHaveLength(1);
      expect(warn).not.toHaveBeenCalled();
      unmount();
      expect(toaster.store.getSnapshot().visible).toHaveLength(0);
      toaster.toast("Dropped");
      expect(toaster.store.getSnapshot().visible).toHaveLength(0);
    });

    it("renders the default toaster's toasts when given no toaster", () => {
      const { unmount } = render(<ToastRegion />);
      expect(peekDefaultToaster()).toBeDefined();
      act(() => {
        toast("From the default toaster");
      });
      expect(messages()).toEqual(["From the default toaster"]);
      unmount();
      expect(peekDefaultToaster()?.store.getSnapshot().visible).toHaveLength(0);
    });

    it("renders no toast, no popover and no announcer on the server", () => {
      const toaster = createToaster();
      const unregister = toaster.store.registerRegion();
      toaster.toast("Client only");
      const html = renderToString(<ToastRegion toaster={toaster} />);
      expect(html).not.toContain("Client only");
      expect(html).not.toContain("popover");
      expect(html).not.toContain("aria-live");
      unregister();
    });
  });

  describe("pausing", () => {
    function spies(toaster: Toaster) {
      return { pause: vi.spyOn(toaster.store, "pause"), resume: vi.spyOn(toaster.store, "resume") };
    }

    function raised(): Toaster {
      const toaster = createToaster();
      mount(toaster);
      act(() => {
        toaster.toast("First", { action: { label: "Undo", onAction: () => {} } });
        toaster.toast("Second");
      });
      return toaster;
    }

    it("pauses while the pointer is over the region and resumes when it leaves", () => {
      const { pause, resume } = spies(raised());
      fireEvent.pointerEnter(region());
      expect(pause).toHaveBeenCalled();
      expect(resume).not.toHaveBeenCalled();
      fireEvent.pointerLeave(region());
      expect(resume).toHaveBeenCalled();
    });

    it("pauses while focus is inside the region and resumes when it leaves", () => {
      const toaster = raised();
      const outside = document.createElement("button");
      document.body.append(outside);
      const { pause, resume } = spies(toaster);
      const [undo, dismiss] = within(region()).getAllByRole("button");
      act(() => {
        undo?.focus();
      });
      expect(pause).toHaveBeenCalled();
      act(() => {
        toaster.toast("Third");
      });
      act(() => {
        dismiss?.focus();
      });
      expect(resume).not.toHaveBeenCalled();
      act(() => {
        outside.focus();
      });
      expect(resume).toHaveBeenCalled();
      outside.remove();
    });

    it("stays paused while focus remains inside after the pointer leaves", () => {
      const { pause, resume } = spies(raised());
      fireEvent.pointerEnter(region());
      act(() => {
        within(region()).getAllByRole("button")[0]?.focus();
      });
      fireEvent.pointerLeave(region());
      expect(pause).toHaveBeenCalled();
      expect(resume).not.toHaveBeenCalled();
      act(() => {
        (document.activeElement as HTMLElement).blur();
      });
      expect(resume).toHaveBeenCalled();
    });

    it("stays paused while the pointer remains over it after focus leaves", () => {
      const { resume } = spies(raised());
      fireEvent.pointerEnter(region());
      act(() => {
        within(region()).getAllByRole("button")[0]?.focus();
      });
      act(() => {
        (document.activeElement as HTMLElement).blur();
      });
      expect(resume).not.toHaveBeenCalled();
      fireEvent.pointerLeave(region());
      expect(resume).toHaveBeenCalled();
    });

    it("releases the focus hold when the focused toast is removed", () => {
      const toaster = raised();
      const { resume } = spies(toaster);
      act(() => {
        within(region()).getAllByRole("button", { name: "Dismiss notification" })[0]?.focus();
      });
      act(() => {
        toaster.toast.dismiss(toaster.store.getSnapshot().visible[0]?.id);
      });
      expect(resume).toHaveBeenCalled();
    });

    it("releases the hover hold once no toast is left", () => {
      const toaster = raised();
      const { resume } = spies(toaster);
      fireEvent.pointerEnter(region());
      act(() => {
        toaster.toast.dismiss(toaster.store.getSnapshot().visible[0]?.id);
      });
      expect(resume).not.toHaveBeenCalled();
      act(() => {
        toaster.toast.dismiss();
      });
      expect(resume).toHaveBeenCalled();
    });
  });
});
