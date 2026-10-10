import { act, createEvent, fireEvent, render, screen, within } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, type MockInstance, vi } from "vitest";
import { type ToastPlacement, ToastRegion } from "./ToastRegion.js";
import { createToaster, peekDefaultToaster, type Toaster, type ToastTone, toast } from "./toaster.js";
import { SWIPE_SLOP } from "./useSwipeDismiss.js";

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

  describe("queue count", () => {
    function queuedCount(): HTMLElement | null {
      return region().querySelector<HTMLElement>(".vpg-toast-queued");
    }

    function raise(toaster: Toaster, count: number) {
      act(() => {
        for (let index = 1; index <= count; index++) toaster.toast(`Toast ${index}`);
      });
    }

    it("renders no count while nothing is queued", () => {
      const toaster = createToaster();
      mount(toaster);
      raise(toaster, 3);
      expect(toastItems()).toHaveLength(3);
      expect(queuedCount()).toBeNull();
    });

    it("counts the toasts waiting behind the visible three in a plain paragraph", () => {
      const toaster = createToaster();
      mount(toaster);
      raise(toaster, 6);
      const count = queuedCount();
      expect(count?.tagName).toBe("P");
      expect(count).toHaveTextContent("+3 more");
    });

    it("updates as the queue drains and disappears once it is empty", () => {
      const toaster = createToaster();
      mount(toaster);
      raise(toaster, 5);
      expect(queuedCount()).toHaveTextContent("+2 more");
      fireEvent.click(within(toastItems()[0] as HTMLElement).getByRole("button", { name: "Dismiss notification" }));
      expect(queuedCount()).toHaveTextContent("+1 more");
      fireEvent.click(within(toastItems()[0] as HTMLElement).getByRole("button", { name: "Dismiss notification" }));
      expect(queuedCount()).toBeNull();
      expect(messages()).toEqual(["Toast 3", "Toast 4", "Toast 5"]);
    });

    it("renders no count when a toast raised behind three persistent ones replaces the oldest of them", () => {
      const toaster = createToaster();
      mount(toaster);
      act(() => {
        for (const message of ["One", "Two", "Three"]) toaster.toast(message, { duration: Number.POSITIVE_INFINITY });
        toaster.toast("Four");
      });
      expect(messages()).toEqual(["Two", "Three", "Four"]);
      expect(queuedCount()).toBeNull();
    });

    it("is neither live, nor in the announcer, nor focusable", () => {
      const toaster = createToaster();
      mount(toaster);
      raise(toaster, 4);
      const count = queuedCount() as HTMLElement;
      expect(count).not.toHaveAttribute("aria-live");
      expect(count).not.toHaveAttribute("role");
      expect(count).not.toHaveAttribute("tabindex");
      expect(document.querySelectorAll("[aria-live]")).toHaveLength(1);
      expect(announcer()).not.toHaveTextContent("more");
      expect(announcer().children).toHaveLength(3);
      expect(popoverElement()).not.toContainElement(announcer());
    });

    it("sits after the list at the top, away from the top edge", () => {
      const toaster = createToaster();
      mount(toaster, "top-end");
      raise(toaster, 4);
      expect(region().lastElementChild).toBe(queuedCount());
      expect(region().firstElementChild).toHaveClass("vpg-toast-list");
    });

    it("sits before the list at the bottom, away from the bottom edge", () => {
      const toaster = createToaster();
      mount(toaster, "bottom-start");
      raise(toaster, 4);
      expect(region().firstElementChild).toBe(queuedCount());
      expect(region().lastElementChild).toHaveClass("vpg-toast-list");
    });

    it("pauses the timers while the pointer is over it, as it is part of the region", () => {
      const toaster = createToaster();
      mount(toaster);
      raise(toaster, 4);
      const pause = vi.spyOn(toaster.store, "pause");
      fireEvent.pointerEnter(queuedCount() as HTMLElement);
      expect(pause).toHaveBeenCalled();
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

  describe("swipe", () => {
    /** The toast's box in the swipe tests: a 300 × 60 toast dismisses after 120px across, or 80px
     * along a centred placement's vertical axis. */
    const WIDTH = 300;
    const HEIGHT = 60;

    /** The pointers jsdom's missing pointer-capture methods report as captured. */
    let captured: Map<Element, Set<number>>;

    beforeEach(() => {
      captured = new Map();
      const prototype = HTMLElement.prototype as unknown as Record<string, unknown>;
      prototype.setPointerCapture = vi.fn(function (this: Element, id: number) {
        captured.set(this, new Set([...(captured.get(this) ?? []), id]));
      });
      prototype.releasePointerCapture = vi.fn(function (this: Element, id: number) {
        captured.get(this)?.delete(id);
      });
      prototype.hasPointerCapture = vi.fn(function (this: Element, id: number) {
        return captured.get(this)?.has(id) ?? false;
      });
      vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 0, WIDTH, HEIGHT));
    });

    afterEach(() => {
      for (const name of ["setPointerCapture", "releasePointerCapture", "hasPointerCapture"]) {
        Reflect.deleteProperty(HTMLElement.prototype, name);
      }
    });

    /** The inline transform a toast swiped `distance` pixels along `axis` carries. */
    function translated(axis: "X" | "Y", distance: number): string {
      return `translate${axis}(${distance}px)`;
    }

    interface PointerInit {
      x?: number;
      y?: number;
      /** The event's `timeStamp`, in milliseconds. */
      at: number;
      pointerId?: number;
      pointerType?: string;
      button?: number;
    }

    type PointerType = "pointerDown" | "pointerMove" | "pointerUp" | "pointerCancel" | "lostPointerCapture";

    /** Fires a pointer event at `target` with the position and time given; jsdom stamps every event
     * with the wall clock, which a velocity cannot be read from. */
    function pointer(
      type: PointerType,
      target: Element,
      { x = 0, y = 0, at, pointerId = 1, pointerType = "touch", button = 0 }: PointerInit,
    ) {
      const event = createEvent[type](target, { clientX: x, clientY: y, pointerId, pointerType, button });
      Object.defineProperty(event, "timeStamp", { value: at });
      return fireEvent(target, event);
    }

    /** Presses at the origin at time 1000, moves through each `[x, y, at]` and, unless `release` is
     * `null`, releases where the last move left off at `release`. */
    function drag(target: Element, moves: [number, number, number][], release: number | null = null, init: Partial<PointerInit> = {}) {
      pointer("pointerDown", target, { ...init, at: 1000 });
      for (const [x, y, at] of moves) pointer("pointerMove", target, { ...init, x, y, at });
      const [x, y] = moves.at(-1) ?? [0, 0];
      if (release !== null) pointer("pointerUp", target, { ...init, x, y, at: release });
    }

    function raised(placement?: ToastPlacement, options: { action?: () => void } = {}): Toaster {
      const toaster = createToaster();
      mount(toaster, placement);
      act(() => {
        toaster.toast("Saved", options.action === undefined ? {} : { action: { label: "Undo", onAction: options.action } });
      });
      return toaster;
    }

    function item(): HTMLElement {
      const [first] = toastItems();
      if (first === undefined) {
        throw new Error("no toast is visible");
      }
      return first;
    }

    it("dismisses a toast swiped past the distance threshold, released slowly", () => {
      raised();
      drag(
        item(),
        [
          [60, 0, 1200],
          [130, 0, 1400],
        ],
        1600,
      );
      expect(toastItems()).toHaveLength(0);
    });

    it("dismisses a toast flicked fast, however short the swipe", () => {
      raised();
      drag(
        item(),
        [
          [10, 0, 1100],
          [40, 0, 1120],
        ],
        1130,
      );
      expect(toastItems()).toHaveLength(0);
    });

    it("snaps a toast back when it is released short of the threshold, slowly", () => {
      raised();
      const element = item();
      drag(element, [
        [60, 0, 1200],
        [110, 0, 1400],
      ]);
      expect(element).toHaveAttribute("data-swiping");
      expect(element.style.transform).toBe(translated("X", 110));
      expect(Number(element.style.opacity)).toBeCloseTo(1 - 110 / WIDTH);
      pointer("pointerUp", element, { x: 110, at: 1450 });
      expect(item()).toBe(element);
      expect(element).not.toHaveAttribute("data-swiping");
      expect(element.style.transform).toBe("");
      expect(element.style.opacity).toBe("");
    });

    it("reads no flick from a swipe that holds still before it is released", () => {
      raised();
      drag(
        item(),
        [
          [10, 0, 1100],
          [40, 0, 1120],
        ],
        1300,
      );
      expect(toastItems()).toHaveLength(1);
    });

    it("reads speed between moves only when time has passed between them", () => {
      raised();
      drag(
        item(),
        [
          [10, 0, 1100],
          [60, 0, 1100],
        ],
        1150,
      );
      expect(toastItems()).toHaveLength(1);
    });

    it("holds the toast at rest while the pointer moves against the dismiss direction", () => {
      raised();
      const element = item();
      drag(element, [
        [-60, 0, 1010],
        [-200, 0, 1020],
      ]);
      expect(element).not.toHaveAttribute("data-swiping");
      expect(element.style.transform).toBe("");
      pointer("pointerUp", element, { x: -200, at: 1025 });
      expect(toastItems()).toHaveLength(1);
    });

    it("clamps a swipe that comes back past where it started to rest", () => {
      raised();
      const element = item();
      drag(element, [
        [50, 0, 1100],
        [-40, 0, 1300],
      ]);
      expect(element.style.transform).toBe(translated("X", 0));
      expect(element.style.opacity).toBe("1");
      pointer("pointerUp", element, { x: -40, at: 1500 });
      expect(toastItems()).toHaveLength(1);
    });

    it("ignores movement across the swipe axis", () => {
      raised("bottom-end");
      const element = item();
      drag(element, [[0, 200, 1200]]);
      expect(element).not.toHaveAttribute("data-swiping");
    });

    describe.each<[ToastPlacement, "ltr" | "rtl", "X" | "Y", number]>([
      ["bottom-end", "ltr", "X", 100],
      ["top-end", "ltr", "X", 100],
      ["bottom-start", "ltr", "X", -100],
      ["top-start", "ltr", "X", -100],
      ["bottom-end", "rtl", "X", -100],
      ["top-start", "rtl", "X", 100],
      ["top-center", "ltr", "Y", -100],
      ["bottom-center", "rtl", "Y", 100],
    ])("placed %s in a %s document", (placement, direction, axis, distance) => {
      const [x, y] = axis === "X" ? [distance, 0] : [0, distance];
      function raisedIn(): Toaster {
        const toaster = createToaster();
        render(
          <div className="vpg-root" style={{ direction }}>
            <ToastRegion toaster={toaster} placement={placement} />
          </div>,
        );
        act(() => {
          toaster.toast("Saved");
        });
        return toaster;
      }

      it(`follows the pointer toward the edge, ${distance}px along ${axis}`, () => {
        raisedIn();
        const element = item();
        drag(element, [[x, y, 1500]]);
        expect(element.style.transform).toBe(translated(axis, distance));
      });

      it("dismisses once swiped past the threshold toward the edge", () => {
        raisedIn();
        drag(item(), [[x * 1.3, y * 1.3, 1500]], 1600);
        expect(toastItems()).toHaveLength(0);
      });

      it("stays put when swiped away from the edge", () => {
        raisedIn();
        const element = item();
        drag(element, [[-x * 2, -y * 2, 1010]], 1015);
        expect(element.style.transform).toBe("");
        expect(toastItems()).toHaveLength(1);
      });
    });

    it("measures a centred toast's threshold along its height", () => {
      raised("bottom-center");
      drag(item(), [[0, 90, 1500]], 1600);
      expect(toastItems()).toHaveLength(0);
    });

    it("captures the pointer when pressed and releases it when the press ends", () => {
      raised();
      const element = item();
      pointer("pointerDown", element, { at: 1000, pointerId: 7 });
      expect(element.setPointerCapture).toHaveBeenCalledWith(7);
      expect(element.hasPointerCapture(7)).toBe(true);
      pointer("pointerUp", element, { at: 1100, pointerId: 7 });
      expect(element.releasePointerCapture).toHaveBeenCalledWith(7);
      expect(element.hasPointerCapture(7)).toBe(false);
    });

    it("releases no capture the browser has already taken back", () => {
      raised();
      const element = item();
      pointer("pointerDown", element, { at: 1000 });
      captured.clear();
      pointer("pointerUp", element, { at: 1100 });
      expect(element.releasePointerCapture).not.toHaveBeenCalled();
    });

    it("treats a movement shorter than the slop as a click, which goes through", () => {
      raised();
      const element = item();
      const clicked = vi.fn();
      region().addEventListener("click", clicked);
      drag(element, [[SWIPE_SLOP - 1, 0, 1100]], 1150);
      expect(element).not.toHaveAttribute("data-swiping");
      expect(fireEvent.click(element)).toBe(true);
      expect(clicked).toHaveBeenCalledTimes(1);
      expect(toastItems()).toHaveLength(1);
    });

    it("swallows the click that follows a swipe, and only that one", () => {
      raised();
      const element = item();
      const clicked = vi.fn();
      region().addEventListener("click", clicked);
      drag(element, [[60, 0, 1300]], 1500);
      expect(fireEvent.click(element)).toBe(false);
      expect(clicked).not.toHaveBeenCalled();
      expect(fireEvent.click(element)).toBe(true);
      expect(clicked).toHaveBeenCalledTimes(1);
    });

    it("lets a later click through when none followed the swipe", async () => {
      raised();
      const element = item();
      const clicked = vi.fn();
      region().addEventListener("click", clicked);
      drag(element, [[60, 0, 1300]], 1500);
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve));
      });
      expect(fireEvent.click(element)).toBe(true);
      expect(clicked).toHaveBeenCalledTimes(1);
    });

    it.each(["Undo", "Dismiss notification"])("starts no swipe from the %s button, and the button still works", (name) => {
      const onAction = vi.fn();
      raised(undefined, { action: onAction });
      const element = item();
      const button = within(element).getByRole("button", { name });
      const glyph = button.querySelector("svg") ?? button;
      pointer("pointerDown", glyph, { at: 1000, pointerType: "mouse" });
      expect(element.setPointerCapture).not.toHaveBeenCalled();
      pointer("pointerMove", glyph, { x: 200, at: 1100, pointerType: "mouse" });
      pointer("pointerUp", glyph, { x: 200, at: 1200, pointerType: "mouse" });
      expect(element).not.toHaveAttribute("data-swiping");
      expect(toastItems()).toHaveLength(1);
      fireEvent.click(button);
      expect(toastItems()).toHaveLength(0);
      expect(onAction).toHaveBeenCalledTimes(name === "Undo" ? 1 : 0);
    });

    it("swipes with the primary mouse button, and with no other", () => {
      raised();
      const element = item();
      drag(element, [[60, 0, 1100]], null, { pointerType: "mouse", button: 2 });
      expect(element).not.toHaveAttribute("data-swiping");
      drag(element, [[60, 0, 1100]], null, { pointerType: "mouse", button: 0 });
      expect(element).toHaveAttribute("data-swiping");
    });

    it("follows only the pointer that started the swipe", () => {
      raised();
      const element = item();
      drag(element, [[60, 0, 1300]], null, { pointerId: 1 });
      pointer("pointerDown", element, { at: 1310, pointerId: 2 });
      expect(element.setPointerCapture).toHaveBeenCalledTimes(1);
      pointer("pointerMove", element, { x: 300, at: 1320, pointerId: 2 });
      expect(element.style.transform).toBe(translated("X", 60));
      for (const type of ["pointerUp", "pointerCancel", "lostPointerCapture"] as const) {
        pointer(type, element, { x: 300, at: 1330, pointerId: 2 });
      }
      expect(element).toHaveAttribute("data-swiping");
      pointer("pointerUp", element, { x: 60, at: 1500, pointerId: 1 });
      expect(element).not.toHaveAttribute("data-swiping");
      expect(toastItems()).toHaveLength(1);
    });

    it.each(["pointerCancel", "lostPointerCapture"] as const)("puts the toast back at rest on %s, without dismissing it", (type) => {
      raised();
      const element = item();
      drag(element, [[200, 0, 1300]]);
      pointer(type, element, { x: 200, at: 1310 });
      expect(element).not.toHaveAttribute("data-swiping");
      expect(element.style.transform).toBe("");
      pointer("pointerUp", element, { x: 200, at: 1320 });
      expect(toastItems()).toHaveLength(1);
    });

    describe("pausing", () => {
      function spies(toaster: Toaster) {
        return { pause: vi.spyOn(toaster.store, "pause"), resume: vi.spyOn(toaster.store, "resume") };
      }

      it("pauses once a press becomes a swipe, with no hover, and resumes when it ends", () => {
        const { pause, resume } = spies(raised());
        const element = item();
        drag(element, [[SWIPE_SLOP - 1, 0, 1100]]);
        expect(pause).not.toHaveBeenCalled();
        pointer("pointerMove", element, { x: 60, at: 1200 });
        expect(pause).toHaveBeenCalled();
        expect(resume).not.toHaveBeenCalled();
        pointer("pointerUp", element, { x: 60, at: 1400 });
        expect(resume).toHaveBeenCalled();
      });

      it("stays paused after a swipe while the pointer remains over the region", () => {
        const { resume } = spies(raised());
        fireEvent.pointerEnter(region());
        drag(item(), [[60, 0, 1300]], 1500);
        expect(resume).not.toHaveBeenCalled();
        fireEvent.pointerLeave(region());
        expect(resume).toHaveBeenCalled();
      });

      it("stays paused through a swipe the pointer leaves the region during", () => {
        const { resume } = spies(raised());
        fireEvent.pointerEnter(region());
        drag(item(), [[60, 0, 1300]]);
        fireEvent.pointerLeave(region());
        expect(resume).not.toHaveBeenCalled();
        pointer("pointerUp", item(), { x: 60, at: 1500 });
        expect(resume).toHaveBeenCalled();
      });

      it("resumes when a swipe is cancelled", () => {
        const { resume } = spies(raised());
        drag(item(), [[60, 0, 1300]]);
        pointer("pointerCancel", item(), { x: 60, at: 1310 });
        expect(resume).toHaveBeenCalled();
      });

      it("resumes when the toast being swiped is dismissed by other means", () => {
        const toaster = raised();
        act(() => {
          toaster.toast("Second");
        });
        const { resume } = spies(toaster);
        drag(item(), [[60, 0, 1300]]);
        act(() => {
          toaster.toast.dismiss(toaster.store.getSnapshot().visible[0]?.id);
        });
        expect(resume).toHaveBeenCalled();
        expect(messages()).toEqual(["Second"]);
      });

      describe("with two toasts swiped at once", () => {
        /** Two toasts, both swiped at once, each by its own pointer. */
        function swipedTwo() {
          const toaster = raised();
          act(() => {
            toaster.toast("Second");
          });
          const [first, second] = toastItems() as [HTMLElement, HTMLElement];
          drag(first, [[60, 0, 1300]], null, { pointerId: 1 });
          drag(second, [[60, 0, 1300]], null, { pointerId: 2 });
          return { toaster, first, second, ...spies(toaster) };
        }

        it.each(["pointerUp", "pointerCancel", "lostPointerCapture"] as const)(
          "stays paused when the first swipe ends on %s, and resumes when the second ends",
          (type) => {
            const { first, second, resume } = swipedTwo();
            pointer(type, first, { x: 60, at: 1310, pointerId: 1 });
            expect(first).not.toHaveAttribute("data-swiping");
            expect(second).toHaveAttribute("data-swiping");
            expect(resume).not.toHaveBeenCalled();
            pointer(type, second, { x: 60, at: 1320, pointerId: 2 });
            expect(resume).toHaveBeenCalled();
          },
        );

        it("stays paused when one swiped toast is removed while the other is still swiped", () => {
          const { toaster, second, resume } = swipedTwo();
          act(() => {
            toaster.toast.dismiss(toaster.store.getSnapshot().visible[0]?.id);
          });
          expect(resume).not.toHaveBeenCalled();
          pointer("pointerUp", second, { x: 60, at: 1400, pointerId: 2 });
          expect(resume).toHaveBeenCalled();
        });
      });

      it("releases nothing when a toast pressed but not swiped is removed", () => {
        const toaster = raised();
        act(() => {
          toaster.toast("Second");
        });
        fireEvent.pointerEnter(region());
        const { resume } = spies(toaster);
        drag(item(), [[2, 0, 1100]]);
        act(() => {
          toaster.toast.dismiss(toaster.store.getSnapshot().visible[0]?.id);
        });
        expect(resume).not.toHaveBeenCalled();
      });
    });
  });

  describe("keyboard", () => {
    function press(init: KeyboardEventInit, target: Element = document.body) {
      fireEvent.keyDown(target, init);
    }

    /** A button outside the region, focused, so there is somewhere for focus to come from. */
    function focusedOutside(): HTMLButtonElement {
      const button = document.createElement("button");
      inserted.push(button);
      document.body.append(button);
      act(() => {
        button.focus();
      });
      return button;
    }

    function listen() {
      const heard = vi.fn();
      document.addEventListener("keydown", heard);
      return { heard, stop: () => document.removeEventListener("keydown", heard) };
    }

    it("focuses the region, empty or not, when F8 is pressed anywhere in the document", () => {
      mount(createToaster());
      const outside = focusedOutside();
      press({ key: "F8", code: "F8" }, outside);
      expect(region()).toHaveFocus();
    });

    it("is a programmatic focus target only, never a tab stop", () => {
      mount(createToaster());
      expect(region()).toHaveAttribute("tabindex", "-1");
    });

    it("ignores other keys, and F8 with a modifier held", () => {
      mount(createToaster());
      press({ key: "F9", code: "F9" });
      press({ key: "F8", code: "F8", shiftKey: true });
      press({ key: "F8", code: "F8", ctrlKey: true });
      press({ key: "F8", code: "F8", altKey: true });
      press({ key: "F8", code: "F8", metaKey: true });
      expect(region()).not.toHaveFocus();
    });

    it("answers a custom hotkey in any case, with exactly its modifiers", () => {
      render(<ToastRegion toaster={createToaster()} hotkey="Alt+T" />);
      const labelled = screen.getByRole("region", { name: "Notifications (Alt+T)" });
      press({ key: "F8", code: "F8" });
      press({ key: "t", code: "KeyT" });
      press({ key: "T", code: "KeyT", altKey: true, shiftKey: true });
      press({ key: "y", code: "KeyY", altKey: true });
      expect(labelled).not.toHaveFocus();
      press({ key: "T", code: "KeyT", altKey: true });
      expect(labelled).toHaveFocus();
    });

    it("matches a letter by its physical key when a modifier changes the typed character", () => {
      render(<ToastRegion toaster={createToaster()} hotkey="Alt+T" />);
      press({ key: "†", code: "KeyT", altKey: true });
      expect(screen.getByRole("region", { name: "Notifications (Alt+T)" })).toHaveFocus();
    });

    it("matches a key that is not a letter by its name only", () => {
      render(<ToastRegion toaster={createToaster()} hotkey="Alt+1" />);
      const labelled = screen.getByRole("region", { name: "Notifications (Alt+1)" });
      press({ key: "¡", code: "Digit1", altKey: true });
      expect(labelled).not.toHaveFocus();
      press({ key: "1", code: "Digit1", altKey: true });
      expect(labelled).toHaveFocus();
    });

    it.each<[string, KeyboardEventInit]>([
      ["Control+Shift+K", { key: "K", code: "KeyK", ctrlKey: true, shiftKey: true }],
      ["Ctrl+K", { key: "k", code: "KeyK", ctrlKey: true }],
      ["Meta+K", { key: "k", code: "KeyK", metaKey: true }],
    ])("answers the modifiers %s names", (hotkey, init) => {
      render(<ToastRegion toaster={createToaster()} hotkey={hotkey} />);
      press(init);
      expect(screen.getByRole("region", { name: `Notifications (${hotkey})` })).toHaveFocus();
    });

    it.each(["Hyper+T", "constructor+T"])("answers nothing when its hotkey %s names an unknown modifier", (hotkey) => {
      render(<ToastRegion toaster={createToaster()} hotkey={hotkey} />);
      press({ key: "t", code: "KeyT" });
      press({ key: "t", code: "KeyT", altKey: true });
      expect(screen.getByRole("region", { name: `Notifications (${hotkey})` })).not.toHaveFocus();
    });

    it("answers the hotkey it is given after a re-render, and not the one before", () => {
      const toaster = createToaster();
      const { rerender } = render(<ToastRegion toaster={toaster} />);
      rerender(<ToastRegion toaster={toaster} hotkey="F9" />);
      const labelled = screen.getByRole("region", { name: "Notifications (F9)" });
      press({ key: "F8", code: "F8" });
      expect(labelled).not.toHaveFocus();
      press({ key: "F9", code: "F9" });
      expect(labelled).toHaveFocus();
    });

    it("stops listening once it unmounts", () => {
      const remove = vi.spyOn(document, "removeEventListener");
      const { unmount } = mount(createToaster());
      unmount();
      expect(remove).toHaveBeenCalledWith("keydown", expect.any(Function));
      press({ key: "F8", code: "F8" });
      expect(document.activeElement).toBe(document.body);
    });

    describe("several regions", () => {
      function regions(name = "Notifications (F8)"): HTMLElement[] {
        return screen.getAllByRole("region", { name });
      }

      function twoRegions(second?: string) {
        return render(
          <>
            <section data-testid="first">
              <ToastRegion toaster={createToaster()} />
            </section>
            <section data-testid="second">
              <ToastRegion toaster={createToaster()} hotkey={second} />
            </section>
          </>,
        );
      }

      it("focuses only the first region in document order, focused once", () => {
        twoRegions();
        const [first, second] = regions();
        const focus = vi.spyOn(HTMLElement.prototype, "focus");
        act(() => {
          second?.focus();
        });
        focus.mockClear();
        press({ key: "F8", code: "F8" });
        expect(first).toHaveFocus();
        expect(focus).toHaveBeenCalledTimes(1);
      });

      it("falls through to the next region when the first cannot take focus", () => {
        twoRegions();
        const [first, second] = regions();
        vi.spyOn(first as HTMLElement, "focus").mockImplementation(() => {});
        press({ key: "F8", code: "F8" });
        expect(second).toHaveFocus();
      });

      it("focuses nothing when no region can take focus", () => {
        twoRegions();
        for (const element of regions()) vi.spyOn(element, "focus").mockImplementation(() => {});
        press({ key: "F8", code: "F8" });
        expect(document.activeElement).toBe(document.body);
      });

      it("lets a later region answer a hotkey the first does not", () => {
        twoRegions("F9");
        press({ key: "F9", code: "F9" });
        expect(regions("Notifications (F9)")[0]).toHaveFocus();
        expect(regions()[0]).not.toHaveFocus();
      });
    });

    describe("Escape", () => {
      function raised(): Toaster {
        const toaster = createToaster();
        mount(toaster);
        act(() => {
          toaster.toast("Saved");
        });
        return toaster;
      }

      function dismissButton(): HTMLElement {
        return within(region()).getByRole("button", { name: "Dismiss notification" });
      }

      it("goes no further than the region, so a document listener never hears it", () => {
        raised();
        const { heard, stop } = listen();
        try {
          press({ key: "Escape", code: "Escape" }, dismissButton());
          press({ key: "Escape", code: "Escape" }, region());
          expect(heard).not.toHaveBeenCalled();
        } finally {
          stop();
        }
      });

      it("cancels its default, so a modal dialog the region sits in raises no cancel", () => {
        raised();
        expect(fireEvent.keyDown(region(), { key: "Escape", code: "Escape" })).toBe(false);
      });

      it("returns focus to the element it came from, and dismisses no toast", () => {
        const toaster = raised();
        const outside = focusedOutside();
        press({ key: "F8", code: "F8" }, outside);
        act(() => {
          dismissButton().focus();
        });
        press({ key: "Escape", code: "Escape" }, dismissButton());
        expect(outside).toHaveFocus();
        expect(toaster.store.getSnapshot().visible).toHaveLength(1);
      });

      it("leaves the region for the body when the element focus came from has gone", () => {
        raised();
        const outside = focusedOutside();
        press({ key: "F8", code: "F8" }, outside);
        outside.remove();
        press({ key: "Escape", code: "Escape" }, region());
        expect(document.activeElement).toBe(document.body);
      });

      it("leaves the region for the body when the element focus came from refuses it", () => {
        raised();
        const outside = focusedOutside();
        press({ key: "F8", code: "F8" }, outside);
        vi.spyOn(outside, "focus").mockImplementation(() => {});
        press({ key: "Escape", code: "Escape" }, region());
        expect(document.activeElement).toBe(document.body);
      });

      it("leaves the region for the body when focus came from nowhere", () => {
        raised();
        press({ key: "F8", code: "F8" });
        expect(region()).toHaveFocus();
        press({ key: "Escape", code: "Escape" }, region());
        expect(document.activeElement).toBe(document.body);
      });

      it("forgets where focus came from once focus leaves the region", () => {
        raised();
        const first = focusedOutside();
        press({ key: "F8", code: "F8" }, first);
        act(() => {
          (document.activeElement as HTMLElement).blur();
        });
        act(() => {
          region().focus();
        });
        press({ key: "Escape", code: "Escape" }, region());
        expect(first).not.toHaveFocus();
        expect(document.activeElement).toBe(document.body);
      });

      it("reaches the document from outside the region", () => {
        mount(createToaster());
        const outside = focusedOutside();
        const { heard, stop } = listen();
        try {
          expect(fireEvent.keyDown(outside, { key: "Escape", code: "Escape" })).toBe(true);
          expect(heard).toHaveBeenCalledTimes(1);
          expect(outside).toHaveFocus();
        } finally {
          stop();
        }
      });

      it("lets every other key pressed inside the region reach the document", () => {
        raised();
        const { heard, stop } = listen();
        try {
          expect(fireEvent.keyDown(region(), { key: "Enter", code: "Enter" })).toBe(true);
          expect(heard).toHaveBeenCalledTimes(1);
        } finally {
          stop();
        }
      });
    });
  });
});
