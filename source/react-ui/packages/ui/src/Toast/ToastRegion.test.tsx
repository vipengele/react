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
});

/** The popover the region renders, looked up by its class: jsdom exposes no top layer to query. */
function popoverElement(): HTMLElement {
  const popover = document.querySelector<HTMLElement>(".vpg-toast-region");
  if (popover === null) {
    throw new Error("no toast region popover was rendered");
  }
  return popover;
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

  describe("portal", () => {
    it("portals the popover into the nearest .vpg-root and keeps the announcer in place", () => {
      const { container } = render(
        <div className="vpg-root">
          <section data-testid="host">
            <ToastRegion toaster={createToaster()} />
          </section>
        </div>,
      );
      expect(popoverElement().parentElement).toBe(container.querySelector(".vpg-root"));
      expect(announcer().parentElement).toBe(screen.getByTestId("host"));
    });

    it("renders the popover inline beside its sentinel when no .vpg-root surrounds it", () => {
      render(
        <section data-testid="host">
          <ToastRegion toaster={createToaster()} />
        </section>,
      );
      expect(popoverElement().parentElement).toBe(screen.getByTestId("host"));
    });

    it("portals into the modal surface it is declared inside", () => {
      render(
        <div className="vpg-root">
          <div data-vpg-overlay-root="" data-testid="surface">
            <ToastRegion toaster={createToaster()} />
          </div>
        </div>,
      );
      expect(popoverElement().parentElement).toBe(screen.getByTestId("surface"));
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

    it("renders without throwing in an engine that lacks the Popover API", () => {
      const show = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "showPopover") as PropertyDescriptor;
      Object.defineProperty(HTMLElement.prototype, "showPopover", { value: undefined, configurable: true });
      try {
        const toaster = createToaster();
        const { unmount } = mount(toaster);
        act(() => {
          toaster.toast("Saved");
        });
        expect(popoverElement().querySelector(".vpg-toast-message")).toHaveTextContent("Saved");
        unmount();
      } finally {
        Object.defineProperty(HTMLElement.prototype, "showPopover", show);
      }
    });
  });

  describe("modal re-show", () => {
    /** Mounts a region and spies on its popover's show and hide from then on, so the initial show
     * is not counted. */
    function mounted() {
      const view = mount(createToaster());
      const popover = popoverElement();
      return { ...view, popover, show: vi.spyOn(popover, "showPopover"), hide: vi.spyOn(popover, "hidePopover") };
    }

    const inserted: Node[] = [];

    /** Appends `node` to the document and lets the mutation observers run. */
    async function insert(node: Node) {
      inserted.push(node);
      await act(async () => {
        document.body.append(node);
      });
    }

    function surface(open: boolean): HTMLDialogElement {
      const element = document.createElement("dialog");
      element.setAttribute("data-vpg-overlay-root", "");
      element.open = open;
      return element;
    }

    afterEach(() => {
      for (const node of inserted.splice(0)) node.parentNode?.removeChild(node);
    });

    it("hides and shows the popover again when a modal surface opens", async () => {
      const { popover, show, hide } = mounted();
      const dialog = surface(false);
      await insert(dialog);
      expect(show).not.toHaveBeenCalled();
      await act(async () => {
        dialog.showModal();
      });
      expect(hide).toHaveBeenCalledTimes(1);
      expect(show).toHaveBeenCalledTimes(1);
      expect(hide.mock.invocationCallOrder[0]).toBeLessThan(show.mock.invocationCallOrder[0] as number);
      expect(show.mock.contexts[0]).toBe(popover);
    });

    it("shows the popover again when a modal surface is inserted already open", async () => {
      const { show } = mounted();
      await insert(surface(true));
      expect(show).toHaveBeenCalledTimes(1);
    });

    it("shows the popover again when an inserted subtree holds an open modal surface", async () => {
      const { show } = mounted();
      const wrapper = document.createElement("section");
      wrapper.append(surface(true));
      await insert(wrapper);
      expect(show).toHaveBeenCalledTimes(1);
    });

    it("leaves the popover alone when a modal surface closes or unrelated content changes", async () => {
      const dialog = surface(true);
      await insert(dialog);
      const { show, hide } = mounted();
      await act(async () => {
        dialog.close();
      });
      await insert(document.createTextNode("text"));
      await insert(document.createElement("aside"));
      const details = document.createElement("details");
      await insert(details);
      await act(async () => {
        details.open = true;
      });
      expect(show).not.toHaveBeenCalled();
      expect(hide).not.toHaveBeenCalled();
    });

    it("stops watching once the region unmounts", async () => {
      const { unmount, show } = mounted();
      unmount();
      await insert(surface(true));
      expect(show).not.toHaveBeenCalled();
    });

    it("mounts without watching in an engine that lacks MutationObserver", async () => {
      vi.stubGlobal("MutationObserver", undefined);
      try {
        const { show } = mounted();
        await insert(surface(true));
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

    it("renders no toast and no popover on the server", () => {
      const toaster = createToaster();
      const unregister = toaster.store.registerRegion();
      toaster.toast("Client only");
      const html = renderToString(<ToastRegion toaster={toaster} />);
      expect(html).not.toContain("Client only");
      expect(html).not.toContain("popover");
      expect(html).toContain('aria-live="polite"');
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
