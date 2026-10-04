import { ThemeProvider } from "@vipengele/react-tokens";
import { cleanup, render, screen } from "@testing-library/react";
import { type ReactNode, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cdp, userEvent } from "vitest/browser";
import { Button } from "../Button/Button.js";
import { Dropdown } from "../Dropdown/Dropdown.js";
import { Popover } from "../Popover/Popover.js";
import { Dialog } from "./Dialog.js";

/**
 * Drives Chromium's own media emulation over CDP, so `(prefers-reduced-motion: reduce)` matches
 * for real. Passing `null` clears the override and returns the page to the host's preference.
 */
async function emulateReducedMotion(value: "reduce" | null) {
  await cdp().send("Emulation.setEmulatedMedia", {
    features: value === null ? [] : [{ name: "prefers-reduced-motion", value }],
  });
}

// The chromium project has no setup file, so nothing auto-cleans between tests the way the
// jsdom project's does; without this a dialog left open by one test keeps the page inert and
// scroll-locked for the next.
afterEach(async () => {
  cleanup();
  await emulateReducedMotion(null);
});

/** The `<dialog>` element, looked up by tag: a closed dialog is `display: none` and so absent
 * from the accessibility tree that a role query searches. */
function dialogElement(): HTMLDialogElement {
  const dialog = document.querySelector("dialog");
  if (dialog === null) {
    throw new Error("no <dialog> was rendered");
  }
  return dialog;
}

/** The topmost element the engine hit-tests at an element's centre — what a pointer there would
 * land on, and so the element that actually paints on top at that point. */
function elementAtCentreOf(element: Element): Element | null {
  const { left, top, width, height } = element.getBoundingClientRect();
  return document.elementFromPoint(left + width / 2, top + height / 2);
}

/** Asserts that the element itself is what the engine hit-tests at its centre and just inside
 * the middle of each edge — so it is painted on top there, and not clipped away by an ancestor's
 * overflow. A centre-only probe passes for a panel cut off along one edge. The edge probes sit at
 * the edges' midpoints because a rounded corner leaves the box's own corner unpainted. */
function expectPaintedWhole(element: Element) {
  const { left, top, right, bottom } = element.getBoundingClientRect();
  const inset = 2;
  const middleX = (left + right) / 2;
  const middleY = (top + bottom) / 2;
  const points = [
    [middleX, middleY],
    [middleX, top + inset],
    [middleX, bottom - inset],
    [left + inset, middleY],
    [right - inset, middleY],
  ] as const;
  for (const [x, y] of points) {
    const hit = document.elementFromPoint(x, y);
    expect(element.contains(hit), `the element at (${x}, ${y}) is ${hit?.tagName ?? "nothing"}`).toBe(true);
  }
}

/** A colour as the 8-bit RGBA a canvas paints it with. Normalises every CSS colour syntax — an
 * `oklch()` token, the relative colour the backdrop derives from it, an `rgb()` — onto one
 * representation, so two colours written in different spaces can be compared. */
function rgbaOf(colour: string): [number, number, number, number] {
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  const context = canvas.getContext("2d") as CanvasRenderingContext2D;
  context.fillStyle = colour;
  context.fillRect(0, 0, 1, 1);
  const [red, green, blue, alpha] = context.getImageData(0, 0, 1, 1).data;
  return [red as number, green as number, blue as number, alpha as number];
}

/** The colour a `--vpg-*` role token resolves to, read by consuming it as a real property —
 * a custom property read back off `getPropertyValue` is its unresolved token stream. */
function resolvedColour(token: string): string {
  const probe = document.createElement("span");
  probe.style.color = `var(${token})`;
  (document.querySelector(".vpg-root") as HTMLElement).append(probe);
  const colour = getComputedStyle(probe).color;
  probe.remove();
  return colour;
}

function renderThemed(ui: ReactNode, colorMode?: "light" | "dark") {
  return render(<ThemeProvider colorMode={colorMode}>{ui}</ThemeProvider>);
}

/** A dialog a button opens, whose parent honours every close request. */
function Opener({ children }: { children?: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Open settings</Button>
      <Dialog aria-label="Settings" open={open} onOpenChange={setOpen}>
        {children}
      </Dialog>
    </>
  );
}

describe("Dialog in a real engine", () => {
  it("paints above a sibling with the highest z-index a page can give it", () => {
    renderThemed(
      <>
        <div data-testid="cover" style={{ position: "fixed", inset: 0, zIndex: 2147483647 }} />
        <Dialog aria-label="Settings" defaultOpen>
          <p>Body</p>
        </Dialog>
      </>,
    );

    const dialog = dialogElement();
    expect(dialog.open).toBe(true);
    // The cover spans the whole viewport, so anything but the dialog at its centre means the
    // cover paints over it.
    const hit = elementAtCentreOf(dialog);
    expect(hit).not.toBeNull();
    expect(dialog.contains(hit)).toBe(true);
  });

  for (const colorMode of ["light", "dark"] as const) {
    it(`draws the backdrop as the ${colorMode} theme's ink at 40% alpha`, () => {
      renderThemed(
        <Dialog aria-label="Settings" defaultOpen>
          <p>Body</p>
        </Dialog>,
        colorMode,
      );

      const ink = rgbaOf(resolvedColour("--vpg-ink"));
      const [red, green, blue, alpha] = rgbaOf(getComputedStyle(dialogElement(), "::backdrop").backgroundColor);

      // A canvas stores colour premultiplied by alpha, so reading a translucent pixel back
      // rounds each channel by up to a couple of steps.
      expect(Math.abs(red - ink[0])).toBeLessThanOrEqual(2);
      expect(Math.abs(green - ink[1])).toBeLessThanOrEqual(2);
      expect(Math.abs(blue - ink[2])).toBeLessThanOrEqual(2);
      expect(alpha).toBe(Math.round(0.4 * 255));
    });
  }

  // A modal dialog makes everything outside it inert, so Tab past its last control never reaches
  // the page behind it: the engine hands focus to the browser's own chrome — here the test
  // runner's frame — and the next Tab that re-enters the document lands on the dialog's first
  // control.
  it("keeps Tab off the page behind the dialog and returns focus to the opener on close", async () => {
    renderThemed(
      <>
        <Opener>
          <Button>First</Button>
          <Button>Last</Button>
        </Opener>
        <Button>Behind</Button>
      </>,
    );
    const opener = screen.getByRole("button", { name: "Open settings" });

    await userEvent.click(opener);
    const dialog = dialogElement();
    expect(dialog.open).toBe(true);
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "First" }));

    await userEvent.tab();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Last" }));

    // Bounded so a focus that never comes back fails here rather than at the test's timeout.
    let presses = 0;
    do {
      await userEvent.tab();
      presses++;
      if (document.hasFocus()) {
        expect(dialog.contains(document.activeElement)).toBe(true);
      }
    } while (!document.hasFocus() && presses < 10);
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "First" }));

    await userEvent.keyboard("{Escape}");
    await vi.waitFor(() => expect(dialog.open).toBe(false));
    expect(document.activeElement).toBe(opener);
  });

  it("locks the page's scroll while open and restores it after close", async () => {
    renderThemed(<Opener />);
    const before = getComputedStyle(document.documentElement).overflow;
    expect(before).not.toBe("hidden");

    await userEvent.click(screen.getByRole("button", { name: "Open settings" }));
    expect(getComputedStyle(document.documentElement).overflow).toBe("hidden");

    await userEvent.keyboard("{Escape}");
    await vi.waitFor(() => expect(dialogElement().open).toBe(false));
    expect(getComputedStyle(document.documentElement).overflow).toBe(before);
  });

  it("stays open through every close request while a controlled parent holds it open", async () => {
    const onOpenChange = vi.fn();
    renderThemed(
      <>
        {/* A spot clear of the centred dialog, so a click there lands on the backdrop. */}
        <div data-testid="corner" style={{ position: "fixed", top: 0, left: 0, width: 16, height: 16 }} />
        <Dialog aria-label="Settings" open onOpenChange={onOpenChange}>
          <form method="dialog">
            <Button type="submit">Done</Button>
          </form>
        </Dialog>
      </>,
    );
    const dialog = dialogElement();
    expect(dialog.open).toBe(true);

    await userEvent.keyboard("{Escape}");
    expect(onOpenChange).toHaveBeenCalledTimes(1);
    expect(dialog.open).toBe(true);

    // With no user activation since the last one, the engine's close watcher refuses to let
    // `cancel` stop a second `Escape` and closes the element itself; the dialog shows it again.
    await userEvent.keyboard("{Escape}");
    await vi.waitFor(() => expect(onOpenChange).toHaveBeenCalledTimes(2));
    await vi.waitFor(() => expect(dialog.open).toBe(true));

    // `force` skips the actionability check, which would refuse a click on an element the
    // backdrop covers; the click still lands wherever the engine hit-tests that point.
    await userEvent.click(screen.getByTestId("corner"), { force: true });
    expect(onOpenChange).toHaveBeenCalledTimes(3);
    expect(dialog.open).toBe(true);

    await userEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(onOpenChange).toHaveBeenCalledTimes(4);
    expect(dialog.open).toBe(true);

    for (const call of onOpenChange.mock.calls) {
      expect(call).toEqual([false]);
    }
    // Still the modal, top-layer dialog rather than one reopened non-modally.
    expect(dialog.matches(":modal")).toBe(true);
  });

  it("shows a Popover opened from inside it above the dialog and inside its overlay root", async () => {
    renderThemed(
      <Dialog aria-label="Settings" defaultOpen>
        <Popover content={<Button>Inside the popover</Button>}>
          <Button>Open popover</Button>
        </Popover>
      </Dialog>,
    );
    const dialog = dialogElement();

    await userEvent.click(screen.getByRole("button", { name: "Open popover" }));
    const panel = document.querySelector(".vpg-popover") as HTMLElement;
    expect(panel).not.toBeNull();

    expect(panel.closest("[data-vpg-overlay-root]")).toBe(dialog);
    expectPaintedWhole(panel);

    const inner = screen.getByRole("button", { name: "Inside the popover" });
    await userEvent.click(inner);
    expect(document.activeElement).toBe(inner);
  });

  it("closes an overlay opened from inside it on Escape, and itself only on the next one", async () => {
    const onOpenChange = vi.fn();
    renderThemed(
      <Dialog aria-label="Settings" defaultOpen onOpenChange={onOpenChange}>
        <Popover content={<Button>Inner</Button>}>
          <Button>Pop</Button>
        </Popover>
      </Dialog>,
    );
    const dialog = dialogElement();
    await userEvent.click(screen.getByRole("button", { name: "Pop" }));
    await expect.element(screen.getByRole("button", { name: "Inner" })).toBeVisible();

    await userEvent.keyboard("{Escape}");
    await vi.waitFor(() => expect(screen.queryByRole("button", { name: "Inner" })).toBeNull());
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(dialog.open).toBe(true);

    await userEvent.keyboard("{Escape}");
    await vi.waitFor(() => expect(dialog.open).toBe(false));
    expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(false);
  });

  it("shows a Dropdown's listbox opened from inside it above the dialog and inside its overlay root", async () => {
    renderThemed(
      <Dialog aria-label="Settings" defaultOpen>
        <Dropdown searchable={false} aria-label="Fruit">
          <Dropdown.Option value="apple" label="Apple" />
          <Dropdown.Option value="banana" label="Banana" />
          <Dropdown.Option value="cherry" label="Cherry" />
        </Dropdown>
      </Dialog>,
    );
    const dialog = dialogElement();

    await userEvent.click(screen.getByRole("combobox"));
    const listbox = screen.getByRole("listbox");

    expect(listbox.closest("[data-vpg-overlay-root]")).toBe(dialog);
    expectPaintedWhole(listbox);

    await userEvent.click(screen.getByRole("option", { name: "Cherry" }));
    expect(screen.getByRole("combobox")).toHaveTextContent("Cherry");
  });

  it("finishes its entry animation at once under prefers-reduced-motion: reduce", async () => {
    await emulateReducedMotion("reduce");
    renderThemed(
      <Dialog aria-label="Settings" defaultOpen>
        <p>Body</p>
      </Dialog>,
    );
    const dialog = dialogElement();

    // A frame is long enough for a collapsed duration to elapse, and far shorter than the
    // full-motion one, so the dialog cannot reach its resting state here by running at full speed.
    await vi.waitFor(
      () => {
        expect(dialog.getAnimations({ subtree: true }).filter((animation) => animation.playState === "running")).toHaveLength(0);
        expect(getComputedStyle(dialog).opacity).toBe("1");
        expect(getComputedStyle(dialog, "::backdrop").opacity).toBe("1");
      },
      { timeout: 100, interval: 16 },
    );
  });
});
