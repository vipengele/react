import { ThemeProvider } from "@vipengele/react-tokens";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import { Dropdown } from "../Dropdown/Dropdown.js";
import { Popover } from "../Popover/Popover.js";
import { Tooltip } from "../Tooltip/Tooltip.js";

// The chromium project has no setup file, so nothing auto-cleans between tests the way the
// jsdom project's does; without this every render after the first collides with the previous
// one and queries start matching more than one overlay. The pointer is moved off whatever it
// last hovered, so a tooltip opened by one test is not reopened by the next.
afterEach(async () => {
  await userEvent.unhover(document.body);
  cleanup();
});

/** The overlap of two rectangles, or `null` where they do not overlap. */
function intersection(a: DOMRect, b: DOMRect): DOMRect | null {
  const left = Math.max(a.left, b.left);
  const top = Math.max(a.top, b.top);
  const right = Math.min(a.right, b.right);
  const bottom = Math.min(a.bottom, b.bottom);
  return right > left && bottom > top ? new DOMRect(left, top, right - left, bottom - top) : null;
}

/** The element painted topmost at the centre of the region where `upper` and `lower` overlap. */
function topmostWhereOverlapping(upper: Element, lower: Element): Element | null {
  const overlap = intersection(upper.getBoundingClientRect(), lower.getBoundingClientRect());
  expect(overlap, "the two overlays overlap on screen").not.toBeNull();
  const { left, top, width, height } = overlap as DOMRect;
  return document.elementFromPoint(left + width / 2, top + height / 2);
}

/** The element painted topmost at the centre of `element`'s own box. */
function topmostAtCentre(element: Element): Element | null {
  const { left, top, width, height } = element.getBoundingClientRect();
  return document.elementFromPoint(left + width / 2, top + height / 2);
}

/** A `Popover` under a real `ThemeProvider` holding a searchable `Dropdown` and a line of text,
 * with a button outside it. The dropdown is the panel's last row, so its listbox opens across
 * the panel's bottom padding and edge. */
function renderDropdownInPopover() {
  render(
    <ThemeProvider>
      <div style={{ padding: "2rem" }}>
        <button type="button">Outside</button>
        <Popover
          content={
            <div style={{ width: "14rem" }}>
              <p>Panel text</p>
              <Dropdown aria-label="Assignee">
                <Dropdown.Option value="ada" label="Ada Lovelace" />
                <Dropdown.Option value="grace" label="Grace Hopper" />
                <Dropdown.Option value="katherine" label="Katherine Johnson" />
              </Dropdown>
            </div>
          }
        >
          <button type="button">Open settings</button>
        </Popover>
      </div>
    </ThemeProvider>,
  );
}

/** Opens the popover, then the dropdown inside it, and returns the panel. */
async function openDropdownInPopover() {
  renderDropdownInPopover();
  await userEvent.click(screen.getByRole("button", { name: "Open settings" }));
  const panel = await screen.findByRole("dialog");
  await userEvent.click(screen.getByRole("combobox", { name: "Assignee" }));
  await screen.findByRole("listbox");
  return panel;
}

describe("a Dropdown inside a Popover, in a browser", () => {
  it("paints the listbox above the popover panel where the two overlap", async () => {
    const panel = await openDropdownInPopover();
    const listboxPanel = document.querySelector(".vpg-listbox-panel") as HTMLElement;

    // Both are portaled into the same `.vpg-root`, so their tokens order them in one stacking
    // context.
    expect(listboxPanel.parentElement).toBe(panel.parentElement);
    expect(Number(getComputedStyle(listboxPanel).zIndex)).toBeGreaterThan(Number(getComputedStyle(panel).zIndex));

    await expect.poll(() => listboxPanel.contains(topmostWhereOverlapping(listboxPanel, panel))).toBe(true);
    expect(screen.getByRole("listbox").contains(topmostAtCentre(screen.getByRole("listbox")))).toBe(true);
  });

  it("returns focus to the dropdown trigger inside the panel when Escape closes the listbox", async () => {
    const panel = await openDropdownInPopover();
    const search = screen.getByRole("combobox", { name: "Search" });
    await expect.poll(() => document.activeElement).toBe(search);

    await userEvent.keyboard("gr");
    expect(search).toHaveProperty("value", "gr");
    await userEvent.keyboard("{Escape}");

    expect(screen.queryByRole("listbox")).toBeNull();
    await expect.poll(() => document.activeElement).toBe(screen.getByRole("combobox", { name: "Assignee" }));
    expect(panel.contains(document.activeElement)).toBe(true);
  });

  it("closes only the listbox on the first Escape, and the popover on the second", async () => {
    await openDropdownInPopover();

    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(screen.queryByRole("dialog")).not.toBeNull();

    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("closes the listbox alone on a press inside the panel but outside the listbox", async () => {
    await openDropdownInPopover();

    await userEvent.click(screen.getByText("Panel text"));

    await expect.poll(() => screen.queryByRole("listbox")).toBeNull();
    expect(screen.queryByRole("dialog")).not.toBeNull();
  });

  it("closes the listbox and the popover together on a press outside both", async () => {
    await openDropdownInPopover();

    // The modal focus manager hides everything outside the panel from the accessibility tree, so
    // the button is found by its text rather than its role.
    await userEvent.click(screen.getByText("Outside"));

    await expect.poll(() => screen.queryByRole("listbox")).toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("keeps the popover open on a press on an option of the listbox", async () => {
    await openDropdownInPopover();

    await userEvent.click(screen.getByRole("option", { name: "Grace Hopper" }));

    await expect.poll(() => screen.queryByRole("listbox")).toBeNull();
    expect(screen.queryByRole("dialog")).not.toBeNull();
    expect(screen.getByRole("combobox", { name: "Assignee" }).textContent).toContain("Grace Hopper");
  });
});

describe("a Tooltip inside a Popover, in a browser", () => {
  /** Opens a popover whose panel holds a tooltip-described button at its top edge, then hovers
   * that button to open the tooltip. */
  async function openTooltipInPopover() {
    render(
      <ThemeProvider>
        <div style={{ padding: "6rem 2rem" }}>
          <Popover
            content={
              <Tooltip content="Copies the link">
                <button type="button">Copy</button>
              </Tooltip>
            }
          >
            <button type="button">Open share</button>
          </Popover>
        </div>
      </ThemeProvider>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Open share" }));
    const panel = await screen.findByRole("dialog");
    await userEvent.hover(screen.getByRole("button", { name: "Copy" }));
    const tooltip = await screen.findByRole("tooltip");
    return { panel, tooltip };
  }

  it("paints the tooltip above the popover panel where the two overlap", async () => {
    const { panel, tooltip } = await openTooltipInPopover();

    expect(tooltip.parentElement).toBe(panel.parentElement);
    expect(Number(getComputedStyle(tooltip).zIndex)).toBeGreaterThan(Number(getComputedStyle(panel).zIndex));

    // The bubble takes no pointer events, and hit testing skips an element that takes none, so
    // `elementFromPoint` would report whatever lies beneath it whatever its stacking. Opting it
    // into hit testing leaves its paint order untouched and makes that order observable.
    tooltip.style.pointerEvents = "auto";
    await expect.poll(() => tooltip.contains(topmostWhereOverlapping(tooltip, panel))).toBe(true);
  });

  it("closes the popover on Escape while the tooltip is open", async () => {
    await openTooltipInPopover();

    await userEvent.keyboard("{Escape}");

    await expect.poll(() => screen.queryByRole("dialog")).toBeNull();
    expect(screen.queryByRole("tooltip")).toBeNull();
  });
});
