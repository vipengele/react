import { ThemeProvider } from "@vipengele/react-tokens";
import { act, cleanup, render } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cdp, userEvent } from "vitest/browser";
import { Dialog } from "../Dialog/Dialog.js";
import { type ToastPlacement, ToastRegion } from "./ToastRegion.js";
import { createToaster, type Toaster } from "./toaster.js";
import { SWIPE_DISTANCE_FRACTION, SWIPE_MIN_DISTANCE, SWIPE_VELOCITY_WINDOW } from "./useSwipeDismiss.js";

/**
 * jsdom has no top layer and lays nothing out, so whether the region is really shown as a popover,
 * and where its placement pins it on the viewport, are only provable in an engine.
 */

// The chromium project has no setup file, so nothing auto-cleans between tests the way the jsdom
// project's does; without this a region left mounted by one test stays in the top layer for the
// next.
afterEach(() => {
  cleanup();
});

/** The spacing step the region is inset from the viewport by: `--vpg-space-4` in the default theme. */
const INSET = 16;

function mount(toaster: Toaster, placement?: ToastPlacement) {
  render(
    <ThemeProvider>
      <ToastRegion toaster={toaster} placement={placement} />
    </ThemeProvider>,
  );
}

function popoverElement(): HTMLElement {
  const popover = document.querySelector<HTMLElement>(".vpg-toast-region");
  if (popover === null) {
    throw new Error("no toast region popover was rendered");
  }
  return popover;
}

function toastElements(): HTMLElement[] {
  return [...popoverElement().querySelectorAll<HTMLElement>(".vpg-toast")];
}

function toastNamed(message: string): HTMLElement {
  const match = toastElements().find((element) => element.querySelector(".vpg-toast-message")?.textContent === message);
  if (match === undefined) {
    throw new Error(`no toast reads "${message}"`);
  }
  return match;
}

/** Resolves once every entry transition in the region has finished, so geometry read afterwards is
 * the toasts' resting place rather than a frame part-way through the slide. */
async function settled() {
  await Promise.all(
    popoverElement()
      .getAnimations({ subtree: true })
      .map((animation) => animation.finished),
  );
}

async function raise(toaster: Toaster, ...messages: string[]) {
  act(() => {
    for (const message of messages) toaster.toast(message);
  });
  await settled();
}

describe("ToastRegion in an engine", () => {
  it("shows its popover in the top layer", () => {
    mount(createToaster());
    expect(popoverElement().matches(":popover-open")).toBe(true);
  });

  it("covers nothing on the page while it holds no toast", () => {
    mount(createToaster());
    expect(popoverElement().getBoundingClientRect().height).toBe(0);
  });

  describe("placement", () => {
    const cases: [ToastPlacement, "top" | "bottom", "start" | "center" | "end"][] = [
      ["top-start", "top", "start"],
      ["top-center", "top", "center"],
      ["top-end", "top", "end"],
      ["bottom-start", "bottom", "start"],
      ["bottom-center", "bottom", "center"],
      ["bottom-end", "bottom", "end"],
    ];

    it.each(cases)("pins %s to its edge of the viewport", async (placement, block, inline) => {
      const toaster = createToaster();
      mount(toaster, placement);
      await raise(toaster, "Saved");
      const { top, bottom, left, right, width } = popoverElement().getBoundingClientRect();
      const viewportWidth = document.documentElement.clientWidth;
      const viewportHeight = document.documentElement.clientHeight;
      expect(width).toBeGreaterThan(0);
      if (block === "top") expect(top).toBeCloseTo(INSET, 0);
      else expect(viewportHeight - bottom).toBeCloseTo(INSET, 0);
      if (inline === "start") expect(left).toBeCloseTo(INSET, 0);
      else if (inline === "end") expect(viewportWidth - right).toBeCloseTo(INSET, 0);
      else expect((left + right) / 2).toBeCloseTo(viewportWidth / 2, 0);
    });

    it("sits at the bottom end by default", async () => {
      const toaster = createToaster();
      mount(toaster);
      await raise(toaster, "Saved");
      const { bottom, right } = popoverElement().getBoundingClientRect();
      expect(document.documentElement.clientHeight - bottom).toBeCloseTo(INSET, 0);
      expect(document.documentElement.clientWidth - right).toBeCloseTo(INSET, 0);
    });
  });

  describe("stacking", () => {
    it("puts the newest toast nearest the bottom edge for a bottom placement", async () => {
      const toaster = createToaster();
      mount(toaster, "bottom-end");
      await raise(toaster, "Older", "Newer");
      expect(toastNamed("Newer").getBoundingClientRect().top).toBeGreaterThan(toastNamed("Older").getBoundingClientRect().bottom);
    });

    it("puts the newest toast nearest the top edge for a top placement", async () => {
      const toaster = createToaster();
      mount(toaster, "top-start");
      await raise(toaster, "Older", "Newer");
      expect(toastNamed("Newer").getBoundingClientRect().bottom).toBeLessThan(toastNamed("Older").getBoundingClientRect().top);
    });

    it("shows at most three toasts and renders none of the queue", async () => {
      const toaster = createToaster();
      mount(toaster);
      await raise(toaster, "One", "Two", "Three", "Four", "Five");
      expect(toastElements().map((element) => element.querySelector(".vpg-toast-message")?.textContent)).toEqual(["One", "Two", "Three"]);
      expect(popoverElement().textContent).not.toContain("Four");
    });
  });

  describe("queue count", () => {
    function queuedCount(): HTMLElement {
      const element = popoverElement().querySelector<HTMLElement>(".vpg-toast-queued");
      if (element === null) {
        throw new Error("no queue count was rendered");
      }
      return element;
    }

    it("sits above the stack for a bottom placement, leaving the newest toast on the bottom edge", async () => {
      const toaster = createToaster();
      mount(toaster, "bottom-end");
      await raise(toaster, "One", "Two", "Three", "Four");
      const count = queuedCount().getBoundingClientRect();
      expect(count.height).toBeGreaterThan(0);
      expect(count.bottom).toBeLessThan(toastNamed("One").getBoundingClientRect().top);
      expect(document.documentElement.clientHeight - toastNamed("Three").getBoundingClientRect().bottom).toBeCloseTo(INSET, 0);
      expect(popoverElement().getBoundingClientRect().right - count.right).toBeCloseTo(0, 0);
    });

    it("sits below the stack for a top placement, leaving the newest toast on the top edge", async () => {
      const toaster = createToaster();
      mount(toaster, "top-start");
      await raise(toaster, "One", "Two", "Three", "Four");
      const count = queuedCount().getBoundingClientRect();
      expect(count.height).toBeGreaterThan(0);
      expect(count.top).toBeGreaterThan(toastNamed("One").getBoundingClientRect().bottom);
      expect(toastNamed("Three").getBoundingClientRect().top).toBeCloseTo(INSET, 0);
      expect(count.left - popoverElement().getBoundingClientRect().left).toBeCloseTo(0, 0);
    });
  });

  describe("swipe", () => {
    /** The test page's offset inside the top-level page, where CDP input coordinates are measured
     * from. */
    function frameOffset(): { left: number; top: number } {
      const frame = window.frameElement?.getBoundingClientRect();
      return { left: frame?.left ?? 0, top: frame?.top ?? 0 };
    }

    /** A real mouse event at the viewport point `(x, y)` through Chromium's input pipeline, which
     * raises the pointer events, pointer capture and click a real drag does. */
    async function mouse(type: "mousePressed" | "mouseMoved" | "mouseReleased", x: number, y: number) {
      const { left, top } = frameOffset();
      await cdp().send("Input.dispatchMouseEvent", {
        type,
        x: left + x,
        y: top + y,
        button: "left",
        buttons: type === "mouseReleased" ? 0 : 1,
        clickCount: type === "mouseMoved" ? 0 : 1,
      });
    }

    /** Waits long enough for a release to read as a stop rather than a flick. */
    async function holdStill() {
      await new Promise((resolve) => setTimeout(resolve, SWIPE_VELOCITY_WINDOW * 2));
    }

    /** Presses inside `element` near its leading corner, then moves by `(dx, dy)` in steps. */
    async function pressAndMove(element: HTMLElement, dx: number, dy: number) {
      const rect = element.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      await mouse("mousePressed", x, y);
      const steps = 8;
      for (let step = 1; step <= steps; step++) {
        await mouse("mouseMoved", x + (dx * step) / steps, y + (dy * step) / steps);
      }
      return { x: x + dx, y: y + dy };
    }

    function rectOf(element: Element) {
      const { left, top } = element.getBoundingClientRect();
      return { left: Math.round(left), top: Math.round(top) };
    }

    /** Raises one toast in a region at `placement`, in a document of the given direction, and
     * returns it at rest. */
    async function restingToast(placement: ToastPlacement, direction: "ltr" | "rtl" = "ltr") {
      const toaster = createToaster();
      render(
        <div dir={direction}>
          <ThemeProvider>
            <ToastRegion toaster={toaster} placement={placement} />
          </ThemeProvider>
        </div>,
      );
      await raise(toaster, "Saved");
      return toastNamed("Saved");
    }

    function threshold(size: number): number {
      return Math.max(SWIPE_MIN_DISTANCE, size * SWIPE_DISTANCE_FRACTION);
    }

    it("dismisses a toast dragged past the threshold toward the edge and released at rest", async () => {
      const element = await restingToast("bottom-end");
      const { x, y } = await pressAndMove(element, threshold(element.getBoundingClientRect().width) + 20, 0);
      await holdStill();
      await mouse("mouseReleased", x, y);
      await expect.poll(() => toastElements()).toHaveLength(0);
    });

    it("snaps a toast dragged short of the threshold back to where it rested", async () => {
      const element = await restingToast("bottom-end");
      const rest = rectOf(element);
      const { x, y } = await pressAndMove(element, 50, 0);
      expect(rectOf(element)).toEqual({ left: rest.left + 50, top: rest.top });
      await holdStill();
      await mouse("mouseReleased", x, y);
      await expect.poll(() => rectOf(element)).toEqual(rest);
      expect(toastElements()).toEqual([element]);
    });

    it.each<[ToastPlacement, "ltr" | "rtl", number, number]>([
      ["bottom-end", "ltr", 60, 0],
      ["top-start", "ltr", -60, 0],
      ["bottom-end", "rtl", -60, 0],
      ["top-center", "ltr", 0, -40],
      ["bottom-center", "ltr", 0, 40],
    ])("moves a toast placed %s in a %s document along its swipe axis only", async (placement, direction, dx, dy) => {
      const element = await restingToast(placement, direction);
      const rest = rectOf(element);
      // The pointer strays across the axis as well; the toast follows only the part along it.
      const { x, y } = await pressAndMove(element, dx + (dy === 0 ? 0 : 30), dy + (dx === 0 ? 0 : 30));
      expect(rectOf(element)).toEqual({ left: rest.left + dx, top: rest.top + dy });
      await holdStill();
      await mouse("mouseReleased", x, y);
      await expect.poll(() => rectOf(element)).toEqual(rest);
    });

    it("holds a toast dragged away from the edge at rest", async () => {
      const element = await restingToast("bottom-end");
      const rest = rectOf(element);
      const { x, y } = await pressAndMove(element, -80, 0);
      expect(rectOf(element)).toEqual(rest);
      await mouse("mouseReleased", x, y);
      expect(toastElements()).toEqual([element]);
    });

    it("swallows the click a swipe ends with", async () => {
      const element = await restingToast("bottom-end");
      const clicked = vi.fn();
      document.addEventListener("click", clicked);
      try {
        const { x, y } = await pressAndMove(element, 50, 0);
        await holdStill();
        await mouse("mouseReleased", x, y);
        expect(clicked).not.toHaveBeenCalled();
      } finally {
        document.removeEventListener("click", clicked);
      }
    });

    it.each(["Undo", "Dismiss notification"])("lets a real click on the %s button through", async (name) => {
      const toaster = createToaster();
      const onAction = vi.fn();
      render(
        <ThemeProvider>
          <ToastRegion toaster={toaster} />
        </ThemeProvider>,
      );
      act(() => {
        toaster.toast("Deleted", { action: { label: "Undo", onAction } });
      });
      await settled();
      const button = popoverElement().querySelector<HTMLElement>(name === "Undo" ? ".vpg-toast-action" : ".vpg-toast-dismiss");
      if (button === null) {
        throw new Error(`no ${name} button was rendered`);
      }
      await userEvent.click(button);
      expect(toastElements()).toHaveLength(0);
      expect(onAction).toHaveBeenCalledTimes(name === "Undo" ? 1 : 0);
    });

    it("lets a click on a button through after a drag that started on it", async () => {
      const toaster = createToaster();
      render(
        <ThemeProvider>
          <ToastRegion toaster={toaster} />
        </ThemeProvider>,
      );
      await raise(toaster, "Saved");
      const element = toastNamed("Saved");
      const button = element.querySelector<HTMLElement>(".vpg-toast-dismiss") as HTMLElement;
      const rest = rectOf(element);
      const rect = button.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      await mouse("mousePressed", x, y);
      await mouse("mouseMoved", x + 3, y);
      expect(rectOf(element)).toEqual(rest);
      await mouse("mouseReleased", x + 3, y);
      await expect.poll(() => toastElements()).toHaveLength(0);
    });
  });

  describe("keyboard", () => {
    function regionOf(popover: Element): HTMLElement {
      const element = popover.querySelector<HTMLElement>(".vpg-toast-viewport");
      if (element === null) {
        throw new Error("no toast region was rendered");
      }
      return element;
    }

    function dialogElement(): HTMLDialogElement {
      const dialog = document.querySelector<HTMLDialogElement>("dialog[data-vpg-overlay-root]");
      if (dialog === null) {
        throw new Error("no dialog was rendered");
      }
      return dialog;
    }

    function insideButton(): HTMLButtonElement {
      const button = dialogElement().querySelector<HTMLButtonElement>("button");
      if (button === null) {
        throw new Error("the dialog holds no button");
      }
      return button;
    }

    /** A region on the page and a dialog held open by state that only its own close request
     * clears. The region is declared outside the dialog; its host moves into it while it is open. */
    function PageWithDialog({ toaster, regionInside = false }: { toaster: Toaster; regionInside?: boolean }) {
      const [open, setOpen] = useState(true);
      return (
        <ThemeProvider>
          {regionInside ? null : <ToastRegion toaster={toaster} />}
          <Dialog aria-label="Edit" open={open} onOpenChange={setOpen}>
            <button type="button">Inside</button>
            {regionInside ? <ToastRegion toaster={toaster} /> : null}
          </Dialog>
        </ThemeProvider>
      );
    }

    /** Opens the dialog, puts focus on its button and raises a toast. */
    async function opened(regionInside = false) {
      const toaster = createToaster();
      render(<PageWithDialog toaster={toaster} regionInside={regionInside} />);
      await raise(toaster, "Saved");
      act(() => {
        insideButton().focus();
      });
      expect(dialogElement().matches(":modal")).toBe(true);
      expect(dialogElement()).toContainElement(popoverElement());
    }

    it("takes focus from F8 over an open dialog", async () => {
      await opened();
      await userEvent.keyboard("{F8}");
      expect(document.activeElement).toBe(regionOf(popoverElement()));
    });

    it.each([
      ["declared on the page", false],
      ["declared inside the dialog", true],
    ])("leaves an open dialog open when Escape is pressed inside a region %s, and returns focus", async (_, regionInside) => {
      await opened(regionInside);
      await userEvent.keyboard("{F8}");
      await userEvent.keyboard("{Escape}");
      expect(dialogElement().open).toBe(true);
      expect(dialogElement().matches(":modal")).toBe(true);
      expect(document.activeElement).toBe(insideButton());
      // The Escape that follows is the dialog's own again.
      await userEvent.keyboard("{Escape}");
      expect(dialogElement().open).toBe(false);
    });

    it("closes the dialog when Escape is pressed inside it but outside the region", async () => {
      await opened();
      await userEvent.keyboard("{Escape}");
      expect(dialogElement().open).toBe(false);
    });

    it("passes over an inert region for the one a modal dialog holds", async () => {
      function TwoRegions() {
        const [dialog, setDialog] = useState<HTMLDialogElement | null>(null);
        if (dialog !== null && !dialog.open) dialog.showModal();
        return (
          <>
            <ThemeProvider>
              <ToastRegion toaster={createToaster()} />
            </ThemeProvider>
            <dialog ref={setDialog} aria-label="Plain">
              <ToastRegion toaster={createToaster()} />
            </dialog>
          </>
        );
      }
      render(<TwoRegions />);
      const [outside, inside] = [...document.querySelectorAll<HTMLElement>(".vpg-toast-viewport")];
      const plain = document.querySelector<HTMLDialogElement>("dialog[aria-label='Plain']");
      expect(plain?.matches(":modal")).toBe(true);
      expect(plain).toContainElement(inside as HTMLElement);
      expect(plain).not.toContainElement(outside as HTMLElement);
      await userEvent.keyboard("{F8}");
      expect(document.activeElement).toBe(inside);
    });
  });
});
