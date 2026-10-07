import { cleanup, render, screen } from "@testing-library/react";
import { ThemeProvider } from "@vipengele/react-tokens";
import type { CSSProperties } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cdp, userEvent } from "vitest/browser";
import { ContextMenu } from "./ContextMenu.js";

// The chromium project has no setup file, so nothing auto-cleans between tests the way the
// jsdom project's does; without this every render after the first collides with the previous
// one and queries start matching more than one menu.
afterEach(() => {
  cleanup();
});

/** The gap `shift` keeps between the panel and a viewport edge it pushes the panel off. */
const VIEWPORT_PADDING = 12;

/** A target covering the whole viewport, flush with its top-left corner, so a point given
 * relative to the target is the same point in viewport coordinates. */
const FULL_VIEWPORT: CSSProperties = { position: "fixed", inset: 0 };

/** A target in a fixed box clear of every viewport edge, leaving page space outside it. */
const BOXED: CSSProperties = { position: "fixed", left: "40px", top: "40px", width: "200px", height: "200px" };

interface RenderOptions {
  regionStyle?: CSSProperties;
  longPressDelay?: number;
  onOpenChange?: (open: boolean) => void;
}

/** A context menu of three rows whose target is a region holding a button, under a real
 * `ThemeProvider`, with a button outside the target. */
function renderContextMenu({ regionStyle = FULL_VIEWPORT, longPressDelay, onOpenChange }: RenderOptions = {}) {
  render(
    <ThemeProvider>
      <button type="button">Outside</button>
      <ContextMenu
        longPressDelay={longPressDelay}
        onOpenChange={onOpenChange}
        target={
          <div data-testid="region" style={regionStyle}>
            <button type="button" style={{ position: "absolute", left: "60px", top: "80px" }}>
              Focusable
            </button>
          </div>
        }
      >
        <ContextMenu.Item>Copy</ContextMenu.Item>
        <ContextMenu.Item>Paste</ContextMenu.Item>
        <ContextMenu.Item>Delete</ContextMenu.Item>
      </ContextMenu>
    </ThemeProvider>,
  );
  return { region: screen.getByTestId("region") };
}

function focusable(): HTMLElement {
  return screen.getByRole("button", { name: "Focusable" });
}

function menu(): HTMLElement | null {
  return screen.queryByRole("menu");
}

/** A real secondary click at `(x, y)` within `element`'s box, measured from its top-left
 * corner. */
async function rightClick(element: Element, x: number, y: number) {
  await userEvent.click(element, { button: "right", position: { x, y } });
}

/** Waits for the panel to open, then for floating-ui to have placed it, and returns it. */
async function openedPanel(): Promise<HTMLElement> {
  const panel = await screen.findByRole("menu");
  await expect.poll(() => panel.style.transform).not.toBe("");
  return panel;
}

/** Waits for the panel's top-left corner to land at the viewport point `(x, y)`. */
async function expectPanelCornerAt(x: number, y: number) {
  await expect
    .poll(() => {
      const rect = menu()?.getBoundingClientRect();
      return rect === undefined ? null : { left: Math.round(rect.left), top: Math.round(rect.top) };
    })
    .toEqual({ left: x, top: y });
}

/** Waits for real focus to land on `element`. */
async function expectFocusOn(element: Element) {
  await expect.poll(() => document.activeElement).toBe(element);
}

/** The test page's offset inside the top-level page, where CDP input coordinates are measured
 * from. */
function frameOffset(): { left: number; top: number } {
  const frame = window.frameElement?.getBoundingClientRect();
  return { left: frame?.left ?? 0, top: frame?.top ?? 0 };
}

/** A real touch through Chromium's input pipeline, which raises the `pointerType: "touch"`
 * pointer events a long press is read from. */
async function touch(type: "touchStart" | "touchMove" | "touchEnd", x = 0, y = 0) {
  const { left, top } = frameOffset();
  await cdp().send("Input.dispatchTouchEvent", {
    type,
    touchPoints: type === "touchEnd" ? [] : [{ x: left + x, y: top + y }],
  });
}

describe("a ContextMenu's placement, in a browser", () => {
  it("opens with the panel's top-left corner at the pointer", async () => {
    const { region } = renderContextMenu();

    await rightClick(region, 150, 200);

    await openedPanel();
    await expectPanelCornerAt(150, 200);
  });

  it("moves to the left of the pointer, inset from the edge, when it would overflow the right edge", async () => {
    const { region } = renderContextMenu();
    const x = window.innerWidth - 5;

    await rightClick(region, x, 200);

    const panel = await openedPanel();
    await expect.poll(() => Math.round(panel.getBoundingClientRect().right)).toBe(window.innerWidth - VIEWPORT_PADDING);
    const rect = panel.getBoundingClientRect();
    expect(rect.left).toBeGreaterThanOrEqual(VIEWPORT_PADDING);
    expect(Math.round(rect.top)).toBe(200);
  });

  it("flips above the pointer when it would overflow the bottom edge", async () => {
    const { region } = renderContextMenu();
    const y = window.innerHeight - 5;

    await rightClick(region, 150, y);

    const panel = await openedPanel();
    await expect.poll(() => Math.round(panel.getBoundingClientRect().bottom)).toBe(y);
    const rect = panel.getBoundingClientRect();
    expect(Math.round(rect.left)).toBe(150);
    expect(rect.top).toBeGreaterThanOrEqual(0);
  });

  it("stays inside the viewport when opened at its bottom-right corner", async () => {
    const { region } = renderContextMenu();
    const x = window.innerWidth - 5;
    const y = window.innerHeight - 5;

    await rightClick(region, x, y);

    const panel = await openedPanel();
    await expect.poll(() => Math.round(panel.getBoundingClientRect().bottom)).toBe(y);
    const rect = panel.getBoundingClientRect();
    expect(Math.round(rect.right)).toBe(window.innerWidth - VIEWPORT_PADDING);
    expect(rect.left).toBeGreaterThanOrEqual(VIEWPORT_PADDING);
    expect(rect.top).toBeGreaterThanOrEqual(0);
  });

  it("opens below the focused element on Shift+F10", async () => {
    renderContextMenu();
    focusable().focus();
    await expectFocusOn(focusable());
    const anchor = focusable().getBoundingClientRect();

    // biome-ignore lint/security/noSecrets: a key sequence, read as a high-entropy string
    await userEvent.keyboard("{Shift>}{F10}{/Shift}");

    await openedPanel();
    await expectPanelCornerAt(Math.round(anchor.left), Math.round(anchor.bottom));
  });

  it("opens below the focused element on the ContextMenu key", async () => {
    renderContextMenu();
    focusable().focus();
    await expectFocusOn(focusable());
    const anchor = focusable().getBoundingClientRect();

    await userEvent.keyboard("{ContextMenu}");

    await openedPanel();
    await expectPanelCornerAt(Math.round(anchor.left), Math.round(anchor.bottom));
  });
});

describe("a ContextMenu's focus handling, in a browser", () => {
  it("returns focus to the element that held it when Escape closes the menu", async () => {
    renderContextMenu();
    focusable().focus();
    await rightClick(focusable(), 4, 4);
    await openedPanel();
    await expectFocusOn(screen.getByRole("menuitem", { name: "Copy" }));

    await userEvent.keyboard("{Escape}");

    await expect.poll(menu).toBeNull();
    await expectFocusOn(focusable());
  });

  it("returns focus to the element that held it when a row is selected", async () => {
    renderContextMenu();
    focusable().focus();
    await rightClick(focusable(), 4, 4);
    await openedPanel();

    await userEvent.click(screen.getByRole("menuitem", { name: "Paste" }));

    await expect.poll(menu).toBeNull();
    await expectFocusOn(focusable());
  });

  it("leaves focus on the body when the menu opened with nothing focused", async () => {
    const { region } = renderContextMenu();
    expect(document.activeElement).toBe(document.body);
    await rightClick(region, 300, 400);
    await openedPanel();

    await userEvent.keyboard("{Escape}");

    await expect.poll(menu).toBeNull();
    await expectFocusOn(document.body);
  });
});

describe("a ContextMenu's secondary clicks while open, in a browser", () => {
  it("moves to a second point on the target, closing and reopening there", async () => {
    const onOpenChange = vi.fn();
    const { region } = renderContextMenu({ regionStyle: BOXED, onOpenChange });
    await rightClick(region, 20, 20);
    await openedPanel();
    await expectPanelCornerAt(60, 60);

    // Clear of the open panel, so the press lands on the target rather than on a row.
    await rightClick(region, 180, 180);

    await expectPanelCornerAt(220, 220);
    expect(onOpenChange.mock.calls).toEqual([[true], [false], [true]]);
  });

  it("closes without reopening on a secondary click outside the target", async () => {
    const onOpenChange = vi.fn();
    const { region } = renderContextMenu({ regionStyle: BOXED, onOpenChange });
    await rightClick(region, 20, 20);
    await openedPanel();

    await rightClick(screen.getByRole("button", { name: "Outside" }), 4, 4);

    await expect.poll(menu).toBeNull();
    expect(onOpenChange.mock.calls).toEqual([[true], [false]]);
  });
});

describe("a ContextMenu's long press, in a browser", () => {
  it("opens with the panel's corner at a touch held still on the target", async () => {
    renderContextMenu({ longPressDelay: 50 });

    await touch("touchStart", 120, 160);

    await openedPanel();
    await expectPanelCornerAt(120, 160);
    await touch("touchEnd");
    expect(menu()).not.toBeNull();
  });

  it("stays shut when the touch drifts past the tolerance before the delay", async () => {
    renderContextMenu({ longPressDelay: 200 });

    await touch("touchStart", 120, 160);
    await touch("touchMove", 150, 160);
    // Past the delay, with the touch still down: the timer has had every chance to fire.
    await new Promise((resolve) => setTimeout(resolve, 400));

    expect(menu()).toBeNull();
    await touch("touchEnd");
  });
});
