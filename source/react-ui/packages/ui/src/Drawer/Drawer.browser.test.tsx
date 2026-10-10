import { ThemeProvider } from "@vipengele/react-tokens";
import { cleanup, render, screen } from "@testing-library/react";
import { type ReactNode, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cdp, userEvent } from "vitest/browser";
import { Button } from "../Button/Button.js";
import { Dialog } from "../Dialog/Dialog.js";
import { Popover } from "../Popover/Popover.js";
import { Drawer } from "./Drawer.js";

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
// jsdom project's does; without this a drawer left open by one test keeps the page inert and
// scroll-locked for the next.
afterEach(async () => {
  cleanup();
  await emulateReducedMotion(null);
});

type Side = "left" | "right" | "top" | "bottom";

const sides: readonly Side[] = ["left", "right", "top", "bottom"];

/** The `<dialog>` element, looked up by tag: a closed drawer is `display: none` and so absent
 * from the accessibility tree that a role query searches. */
function drawerElement(): HTMLDialogElement {
  const dialog = document.querySelector("dialog");
  if (dialog === null) {
    throw new Error("no <dialog> was rendered");
  }
  return dialog;
}

function panelOf(drawer: HTMLDialogElement): HTMLElement {
  return drawer.querySelector(".vpg-drawer-panel") as HTMLElement;
}

/** Resolves once every transition and animation on the drawer and its backdrop has finished, so
 * the geometry read afterwards is the slide's end state rather than a frame part-way through it. */
async function settled(drawer: HTMLDialogElement) {
  await Promise.all(drawer.getAnimations({ subtree: true }).map((animation) => animation.finished));
}

/** The topmost element the engine hit-tests at an element's centre — what a pointer there would
 * land on, and so the element that actually paints on top at that point. */
function elementAtCentreOf(element: Element): Element | null {
  const { left, top, width, height } = element.getBoundingClientRect();
  return document.elementFromPoint(left + width / 2, top + height / 2);
}

/** Asserts that the element itself is what the engine hit-tests at its centre and just inside
 * the middle of each edge — so it is painted on top there, and not clipped away by an ancestor's
 * overflow. The edge probes sit at the edges' midpoints because a rounded corner leaves the box's
 * own corner unpainted. */
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

/** The length a `--vpg-*` token resolves to, in pixels, read by consuming it as a real `width` —
 * a custom property read back off `getPropertyValue` is its unresolved token stream. */
function resolvedLength(token: string): number {
  const probe = document.createElement("div");
  probe.style.position = "absolute";
  probe.style.width = `var(${token})`;
  (document.querySelector(".vpg-root") as HTMLElement).append(probe);
  const length = probe.getBoundingClientRect().width;
  probe.remove();
  return length;
}

/** The box a `position: fixed` element is laid out against — the viewport less any scrollbar
 * gutter, including the one the scroll lock's `scrollbar-gutter: stable` reserves. Measured with a
 * fixed probe, since neither `innerWidth` nor the root's `clientWidth` reliably excludes that
 * gutter. */
function viewport() {
  const probe = document.createElement("div");
  probe.style.position = "fixed";
  probe.style.inset = "0";
  document.body.append(probe);
  const { width, height } = probe.getBoundingClientRect();
  probe.remove();
  return { width, height };
}

function renderThemed(ui: ReactNode) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

/** A drawer a button opens, whose parent honours every close request. */
function Opener({ children, side }: { children?: ReactNode; side?: Side }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Open filters</Button>
      <Drawer aria-label="Filters" side={side} open={open} onOpenChange={setOpen}>
        {children}
      </Drawer>
    </>
  );
}

describe("Drawer in a real engine", () => {
  for (const side of ["left", "right"] as const) {
    it(`sits flush to the ${side} edge at full height and a readable column's width`, async () => {
      renderThemed(
        <Drawer aria-label="Filters" side={side} defaultOpen>
          <p>Body</p>
        </Drawer>,
      );
      const drawer = drawerElement();
      await settled(drawer);

      const { width: viewportWidth, height: viewportHeight } = viewport();
      const expectedWidth = Math.min(resolvedLength("--vpg-width-sm"), viewportWidth - resolvedLength("--vpg-space-6"));
      const rect = drawer.getBoundingClientRect();

      expect(rect.top).toBeCloseTo(0, 0);
      expect(rect.height).toBeCloseTo(viewportHeight, 0);
      expect(rect.width).toBeCloseTo(expectedWidth, 0);
      if (side === "left") {
        expect(rect.left).toBeCloseTo(0, 0);
      } else {
        expect(rect.right).toBeCloseTo(viewportWidth, 0);
      }
    });
  }

  for (const side of ["top", "bottom"] as const) {
    it(`sits flush to the ${side} edge at full width and the height of its content`, async () => {
      renderThemed(
        <Drawer aria-label="Filters" side={side} defaultOpen>
          <div data-testid="content" style={{ height: 100 }} />
        </Drawer>,
      );
      const drawer = drawerElement();
      await settled(drawer);

      const { width: viewportWidth, height: viewportHeight } = viewport();
      const rect = drawer.getBoundingClientRect();
      const panel = getComputedStyle(panelOf(drawer));
      const contentHeight =
        screen.getByTestId("content").getBoundingClientRect().height +
        Number.parseFloat(panel.paddingTop) +
        Number.parseFloat(panel.paddingBottom) +
        Number.parseFloat(panel.borderTopWidth) +
        Number.parseFloat(panel.borderBottomWidth);

      expect(rect.left).toBeCloseTo(0, 0);
      expect(rect.width).toBeCloseTo(viewportWidth, 0);
      expect(rect.height).toBeCloseTo(contentHeight, 0);
      expect(rect.height).toBeLessThanOrEqual(0.85 * viewportHeight + 0.5);
      if (side === "top") {
        expect(rect.top).toBeCloseTo(0, 0);
      } else {
        expect(rect.bottom).toBeCloseTo(viewportHeight, 0);
      }
    });

    it(`caps a ${side} drawer at 85% of the viewport's height and scrolls its panel`, async () => {
      renderThemed(
        <Drawer aria-label="Filters" side={side} defaultOpen>
          <div style={{ height: 5000 }} />
        </Drawer>,
      );
      const drawer = drawerElement();
      await settled(drawer);

      const rect = drawer.getBoundingClientRect();
      expect(rect.height).toBeCloseTo(0.85 * viewport().height, 0);
      const panel = panelOf(drawer);
      expect(panel.getBoundingClientRect().height).toBeCloseTo(rect.height, 0);
      expect(panel.scrollHeight).toBeGreaterThan(panel.clientHeight);
    });
  }

  for (const side of sides) {
    it(`ends its slide in from the ${side} untransformed`, async () => {
      renderThemed(<Opener side={side} />);

      await userEvent.click(screen.getByRole("button", { name: "Open filters" }));
      const drawer = drawerElement();
      expect(drawer.open).toBe(true);
      await settled(drawer);

      expect(getComputedStyle(drawer).transform).toBe("none");
    });

    it(`fills the ${side} drawer with its panel, so only a click outside the panel closes it`, async () => {
      const onOpenChange = vi.fn();
      renderThemed(
        <>
          {/* The page behind the drawer, spanning the viewport, so a click by position on it lands
              wherever the engine hit-tests that point. */}
          <div data-testid="page" style={{ position: "fixed", inset: 0 }} />
          <Drawer aria-label="Filters" side={side} defaultOpen onOpenChange={onOpenChange}>
            <p>Body</p>
          </Drawer>
        </>,
      );
      const drawer = drawerElement();
      await settled(drawer);
      const panel = panelOf(drawer);

      const drawerRect = drawer.getBoundingClientRect();
      const panelRect = panel.getBoundingClientRect();
      expect(panelRect.left).toBeCloseTo(drawerRect.left, 0);
      expect(panelRect.top).toBeCloseTo(drawerRect.top, 0);
      expect(panelRect.right).toBeCloseTo(drawerRect.right, 0);
      expect(panelRect.bottom).toBeCloseTo(drawerRect.bottom, 0);

      // Clicked by position rather than at its centre, so the click lands on the panel's padding
      // rather than on its content.
      await userEvent.click(panel, { position: { x: 4, y: 4 } });
      expect(onOpenChange).not.toHaveBeenCalled();
      expect(drawer.open).toBe(true);

      // A point on the backdrop: the middle of the strip beside a side drawer, of the space below
      // a top drawer and above a bottom one. It stays clear of the gutter the scroll lock
      // reserves, where nothing in the document is hit-tested.
      const { width, height } = viewport();
      const backdropPoint = {
        left: { x: (drawerRect.right + width) / 2, y: height / 2 },
        right: { x: drawerRect.left / 2, y: height / 2 },
        top: { x: width / 2, y: (drawerRect.bottom + height) / 2 },
        bottom: { x: width / 2, y: drawerRect.top / 2 },
      }[side];
      expect(document.elementFromPoint(backdropPoint.x, backdropPoint.y)).toBe(drawer);
      // `force` skips the actionability check, which would refuse a click on an element the
      // backdrop covers.
      await userEvent.click(screen.getByTestId("page"), { position: backdropPoint, force: true });
      await vi.waitFor(() => expect(drawer.open).toBe(false));
      expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(false);
    });
  }

  it("paints above a sibling with the highest z-index a page can give it", async () => {
    renderThemed(
      <>
        <div data-testid="cover" style={{ position: "fixed", inset: 0, zIndex: 2147483647 }} />
        <Drawer aria-label="Filters" defaultOpen>
          <p>Body</p>
        </Drawer>
      </>,
    );

    const drawer = drawerElement();
    expect(drawer.open).toBe(true);
    await settled(drawer);
    // The cover spans the whole viewport, so anything but the drawer at its centre means the
    // cover paints over it.
    const hit = elementAtCentreOf(drawer);
    expect(hit).not.toBeNull();
    expect(drawer.contains(hit)).toBe(true);
  });

  it("locks the page's scroll and makes it inert while open, and restores both after close", async () => {
    renderThemed(
      <>
        <Opener />
        <Button>Behind</Button>
      </>,
    );
    const before = getComputedStyle(document.documentElement).overflow;
    expect(before).not.toBe("hidden");
    const behind = screen.getByRole("button", { name: "Behind" });

    await userEvent.click(screen.getByRole("button", { name: "Open filters" }));
    const drawer = drawerElement();
    expect(drawer.matches(":modal")).toBe(true);
    expect(getComputedStyle(document.documentElement).overflow).toBe("hidden");
    behind.focus();
    expect(document.activeElement).not.toBe(behind);

    await userEvent.keyboard("{Escape}");
    await vi.waitFor(() => expect(drawer.open).toBe(false));
    expect(getComputedStyle(document.documentElement).overflow).toBe(before);
    behind.focus();
    expect(document.activeElement).toBe(behind);
  });

  it("closes on Escape and returns focus to the opener", async () => {
    renderThemed(
      <Opener>
        <Button>Apply</Button>
      </Opener>,
    );
    const opener = screen.getByRole("button", { name: "Open filters" });

    await userEvent.click(opener);
    const drawer = drawerElement();
    expect(drawer.open).toBe(true);
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Apply" }));

    await userEvent.keyboard("{Escape}");
    await vi.waitFor(() => expect(drawer.open).toBe(false));
    expect(document.activeElement).toBe(opener);
  });

  it("shows a Popover opened from inside it above the drawer and inside its overlay root", async () => {
    renderThemed(
      <Drawer aria-label="Filters" defaultOpen>
        <Popover content={<Button>Inside the popover</Button>}>
          <Button>Open popover</Button>
        </Popover>
      </Drawer>,
    );
    const drawer = drawerElement();
    await settled(drawer);

    await userEvent.click(screen.getByRole("button", { name: "Open popover" }));
    const panel = document.querySelector(".vpg-popover") as HTMLElement;
    expect(panel).not.toBeNull();

    expect(panel.closest("[data-vpg-overlay-root]")).toBe(drawer);
    expectPaintedWhole(panel);

    const inner = screen.getByRole("button", { name: "Inside the popover" });
    await userEvent.click(inner);
    expect(document.activeElement).toBe(inner);
  });

  it("finishes its slide at once under prefers-reduced-motion: reduce", async () => {
    await emulateReducedMotion("reduce");
    renderThemed(
      <Drawer aria-label="Filters" defaultOpen>
        <p>Body</p>
      </Drawer>,
    );
    const drawer = drawerElement();

    // A frame is long enough for a collapsed duration to elapse, and far shorter than the
    // full-motion one, so the drawer cannot reach its resting state here by running at full speed.
    await vi.waitFor(
      () => {
        expect(drawer.getAnimations({ subtree: true }).filter((animation) => animation.playState === "running")).toHaveLength(0);
        expect(getComputedStyle(drawer).transform).toBe("none");
        expect(getComputedStyle(drawer, "::backdrop").opacity).toBe("1");
      },
      { timeout: 100, interval: 16 },
    );
  });
});

/** The non-modal drawer's `<div>`, or `null` while it is closed and so not rendered. */
function nonModalDrawer(): HTMLElement | null {
  return document.querySelector<HTMLElement>('.vpg-drawer[data-modal="false"]');
}

function openNonModalDrawer(): HTMLElement {
  const drawer = nonModalDrawer();
  if (drawer === null) {
    throw new Error("no non-modal drawer was rendered");
  }
  return drawer;
}

/** The value a `--vpg-*` token resolves to as a real `z-index`, read off a positioned probe that
 * consumes it — a custom property read back off `getPropertyValue` is its unresolved token stream. */
function resolvedZIndex(token: string): string {
  const probe = document.createElement("div");
  probe.style.position = "relative";
  probe.style.zIndex = `var(${token})`;
  (document.querySelector(".vpg-root") as HTMLElement).append(probe);
  const zIndex = getComputedStyle(probe).zIndex;
  probe.remove();
  return zIndex;
}

/** The overlap of two rectangles, or `null` where they do not overlap. */
function intersection(a: DOMRect, b: DOMRect): DOMRect | null {
  const left = Math.max(a.left, b.left);
  const top = Math.max(a.top, b.top);
  const right = Math.min(a.right, b.right);
  const bottom = Math.min(a.bottom, b.bottom);
  return right > left && bottom > top ? new DOMRect(left, top, right - left, bottom - top) : null;
}

/** A modal surface — a `Dialog` or a modal `Drawer` — that a button inside a non-modal drawer
 * opens, and whose parent honours every close request. */
function ModalOpener({ surface }: { surface: "Dialog" | "Drawer" }) {
  const [open, setOpen] = useState(false);
  const content = <Button>Inside the {surface.toLowerCase()}</Button>;
  return (
    <>
      <Button onClick={() => setOpen(true)}>Open {surface.toLowerCase()}</Button>
      {surface === "Dialog" ? (
        <Dialog aria-label="Confirm" open={open} onOpenChange={setOpen}>
          {content}
        </Dialog>
      ) : (
        <Drawer aria-label="Details" open={open} onOpenChange={setOpen}>
          {content}
        </Drawer>
      )}
    </>
  );
}

describe("a non-modal Drawer in a real engine", () => {
  it("stacks at the --vpg-layer-drawer step", async () => {
    renderThemed(
      <Drawer aria-label="Filters" modal={false} defaultOpen>
        <p>Body</p>
      </Drawer>,
    );
    const drawer = openNonModalDrawer();

    expect(getComputedStyle(drawer).position).toBe("fixed");
    expect(getComputedStyle(drawer).zIndex).toBe(resolvedZIndex("--vpg-layer-drawer"));
    expect(getComputedStyle(drawer).zIndex).toBe("1000");
  });

  for (const side of ["left", "right"] as const) {
    it(`sits flush to the ${side} edge at full height and a readable column's width`, async () => {
      renderThemed(
        <Drawer aria-label="Filters" modal={false} side={side} defaultOpen>
          <p>Body</p>
        </Drawer>,
      );
      const drawer = openNonModalDrawer();
      await settled(drawer as HTMLDialogElement);

      const { width: viewportWidth, height: viewportHeight } = viewport();
      const expectedWidth = Math.min(resolvedLength("--vpg-width-sm"), viewportWidth - resolvedLength("--vpg-space-6"));
      const rect = drawer.getBoundingClientRect();

      expect(rect.top).toBeCloseTo(0, 0);
      expect(rect.height).toBeCloseTo(viewportHeight, 0);
      expect(rect.width).toBeCloseTo(expectedWidth, 0);
      if (side === "left") {
        expect(rect.left).toBeCloseTo(0, 0);
      } else {
        expect(rect.right).toBeCloseTo(viewportWidth, 0);
      }
      expect(getComputedStyle(drawer).transform).toBe("none");
    });
  }

  for (const side of ["top", "bottom"] as const) {
    it(`sits flush to the ${side} edge at full width`, async () => {
      renderThemed(
        <Drawer aria-label="Filters" modal={false} side={side} defaultOpen>
          <div style={{ height: 100 }} />
        </Drawer>,
      );
      const drawer = openNonModalDrawer();
      await settled(drawer as HTMLDialogElement);

      const { width: viewportWidth, height: viewportHeight } = viewport();
      const rect = drawer.getBoundingClientRect();

      expect(rect.left).toBeCloseTo(0, 0);
      expect(rect.width).toBeCloseTo(viewportWidth, 0);
      if (side === "top") {
        expect(rect.top).toBeCloseTo(0, 0);
      } else {
        expect(rect.bottom).toBeCloseTo(viewportHeight, 0);
      }
    });
  }

  it("leaves the page behind it clickable and focusable", async () => {
    const onBehindClick = vi.fn();
    renderThemed(
      <>
        <Button onClick={onBehindClick}>Behind</Button>
        <Drawer aria-label="Filters" modal={false} side="bottom" defaultOpen>
          <Button>Apply</Button>
        </Drawer>
      </>,
    );
    const drawer = openNonModalDrawer();
    await settled(drawer as HTMLDialogElement);
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Apply" }));
    const behind = screen.getByRole("button", { name: "Behind" });

    // The drawer spans only the bottom of the viewport, so the engine hit-tests the button itself
    // at its centre.
    expect(elementAtCentreOf(behind)).toBe(behind);
    await userEvent.click(behind);
    expect(onBehindClick).toHaveBeenCalledOnce();
    expect(document.activeElement).toBe(behind);

    behind.blur();
    behind.focus();
    expect(document.activeElement).toBe(behind);
    expect(behind.closest("[inert]")).toBeNull();
    expect(nonModalDrawer()).toBe(drawer);
  });

  it("leaves the page scrollable while open", async () => {
    renderThemed(
      <>
        <div style={{ height: "300vh" }} />
        <Drawer aria-label="Filters" modal={false} defaultOpen>
          <p>Body</p>
        </Drawer>
      </>,
    );
    openNonModalDrawer();

    expect(getComputedStyle(document.documentElement).overflow).not.toBe("hidden");
    expect(getComputedStyle(document.body).overflow).not.toBe("hidden");
    try {
      window.scrollTo(0, 100);
      expect(window.scrollY).toBe(100);
    } finally {
      window.scrollTo(0, 0);
    }
  });

  it("stays open on a press outside it by default", async () => {
    const onOpenChange = vi.fn();
    renderThemed(
      <>
        <Button>Behind</Button>
        <Drawer aria-label="Filters" modal={false} side="bottom" defaultOpen onOpenChange={onOpenChange}>
          <p>Body</p>
        </Drawer>
      </>,
    );
    const drawer = openNonModalDrawer();

    await userEvent.click(screen.getByRole("button", { name: "Behind" }));

    expect(onOpenChange).not.toHaveBeenCalled();
    expect(nonModalDrawer()).toBe(drawer);
  });

  it("closes on a press outside it when closeOnOutsideClick is on", async () => {
    const onOpenChange = vi.fn();
    renderThemed(
      <>
        <Button>Behind</Button>
        <Drawer aria-label="Filters" modal={false} side="bottom" closeOnOutsideClick defaultOpen onOpenChange={onOpenChange}>
          <p>Body</p>
        </Drawer>
      </>,
    );
    const drawer = openNonModalDrawer();
    await settled(drawer as HTMLDialogElement);

    await userEvent.click(screen.getByText("Body"));
    expect(onOpenChange).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Behind" }));
    await vi.waitFor(() => expect(nonModalDrawer()).toBeNull());
    expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(false);
  });

  it("portals into an open Dialog it is opened from, paints above it and anchors to the viewport", async () => {
    renderThemed(
      <Dialog aria-label="Settings" defaultOpen>
        <p style={{ width: "100vw", height: "100vh" }}>Dialog body</p>
        <Drawer aria-label="Filters" modal={false} side="right" defaultOpen>
          <p>Drawer body</p>
        </Drawer>
      </Dialog>,
    );
    const dialog = document.querySelector("dialog") as HTMLDialogElement;
    const drawer = openNonModalDrawer();
    expect(dialog.open).toBe(true);
    expect(drawer.parentElement).toBe(dialog);
    // The dialog's entry transition gives it a transform, which makes it the containing block of
    // a `position: fixed` descendant until the transition ends.
    await settled(dialog);
    expect(getComputedStyle(dialog).transform).toBe("none");

    const { width: viewportWidth, height: viewportHeight } = viewport();
    const rect = drawer.getBoundingClientRect();
    expect(rect.top).toBeCloseTo(0, 0);
    expect(rect.right).toBeCloseTo(viewportWidth, 0);
    expect(rect.height).toBeCloseTo(viewportHeight, 0);

    const overlap = intersection(rect, dialog.getBoundingClientRect());
    expect(overlap, "the drawer and the dialog overlap on screen").not.toBeNull();
    const { left, top, width, height } = overlap as DOMRect;
    expect(drawer.contains(document.elementFromPoint(left + width / 2, top + height / 2))).toBe(true);
  });

  it("closes a Popover opened from inside it on the first Escape, and itself on the second", async () => {
    renderThemed(
      <Drawer aria-label="Filters" modal={false} defaultOpen>
        <Popover content={<Button>Inside the popover</Button>}>
          <Button>Open popover</Button>
        </Popover>
      </Drawer>,
    );
    const drawer = openNonModalDrawer();

    await userEvent.click(screen.getByRole("button", { name: "Open popover" }));
    expect(document.querySelector(".vpg-popover")).not.toBeNull();

    await userEvent.keyboard("{Escape}");
    await expect.poll(() => document.querySelector(".vpg-popover")).toBeNull();
    expect(nonModalDrawer()).toBe(drawer);

    await userEvent.keyboard("{Escape}");
    await expect.poll(() => nonModalDrawer()).toBeNull();
  });

  it("closes on the first Escape inside an open Dialog, and leaves the Dialog to the second", async () => {
    renderThemed(
      <Dialog aria-label="Settings" defaultOpen>
        <Drawer aria-label="Filters" modal={false} defaultOpen>
          <Button>Apply</Button>
        </Drawer>
      </Dialog>,
    );
    const dialog = document.querySelector("dialog") as HTMLDialogElement;
    openNonModalDrawer();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Apply" }));

    await userEvent.keyboard("{Escape}");
    await expect.poll(() => nonModalDrawer()).toBeNull();
    expect(dialog.open).toBe(true);

    await userEvent.keyboard("{Escape}");
    await vi.waitFor(() => expect(dialog.open).toBe(false));
  });

  for (const surface of ["Dialog", "Drawer"] as const) {
    it(`stays open on a press inside a modal ${surface} opened from inside it, with closeOnOutsideClick on`, async () => {
      const onOpenChange = vi.fn();
      renderThemed(
        <Drawer aria-label="Filters" modal={false} closeOnOutsideClick defaultOpen onOpenChange={onOpenChange}>
          <ModalOpener surface={surface} />
        </Drawer>,
      );
      const drawer = openNonModalDrawer();

      await userEvent.click(screen.getByRole("button", { name: `Open ${surface.toLowerCase()}` }));
      const modal = document.querySelector("dialog") as HTMLDialogElement;
      expect(modal.open).toBe(true);
      await settled(modal);

      const inner = screen.getByRole("button", { name: `Inside the ${surface.toLowerCase()}` });
      await userEvent.click(inner);
      expect(document.activeElement).toBe(inner);
      expect(onOpenChange).not.toHaveBeenCalled();
      expect(nonModalDrawer()).toBe(drawer);
    });
  }
});
