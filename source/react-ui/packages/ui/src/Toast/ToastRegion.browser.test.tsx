import { ThemeProvider } from "@vipengele/react-tokens";
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { type ToastPlacement, ToastRegion } from "./ToastRegion.js";
import { createToaster, type Toaster } from "./toaster.js";

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
});
