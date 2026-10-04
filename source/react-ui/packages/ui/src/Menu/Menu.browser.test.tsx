import { cleanup, render, screen } from "@testing-library/react";
import { ThemeProvider } from "@vipengele/react-tokens";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import { Popover } from "../Popover/Popover.js";
import { Menu } from "./Menu.js";
import { MenuButton } from "./MenuButton.js";

// The chromium project has no setup file, so nothing auto-cleans between tests the way the
// jsdom project's does; without this every render after the first collides with the previous
// one and queries start matching more than one menu.
afterEach(() => {
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

/** The menu's rows, in document order. */
function items(): HTMLElement[] {
  return screen.getAllByRole("menuitem");
}

/** The `Button` trigger of a `MenuButton` labelled `name`. */
function triggerButton(name = "Actions"): HTMLElement {
  return screen.getByRole("button", { name });
}

/** Waits for real focus to land on `element`. */
async function expectFocusOn(element: Element) {
  await expect.poll(() => document.activeElement).toBe(element);
}

/** A `MenuButton` of three plain rows under a real `ThemeProvider`. */
function renderMenuButton({ disabled = false }: { disabled?: boolean } = {}) {
  render(
    <ThemeProvider>
      <div style={{ padding: "2rem" }}>
        <MenuButton label="Actions" disabled={disabled}>
          <Menu.Item>Rename</Menu.Item>
          <Menu.Item>Duplicate</Menu.Item>
          <Menu.Item>Delete</Menu.Item>
        </MenuButton>
      </div>
    </ThemeProvider>,
  );
}

/** Focuses the trigger without opening the menu, so the next key reaches it. */
async function focusTrigger() {
  triggerButton().focus();
  await expectFocusOn(triggerButton());
}

/** A `Popover` under a real `ThemeProvider` holding a line of text and a `MenuButton`, with a
 * button outside it. The menu button is the panel's last row, so its menu opens across the
 * panel's bottom padding and edge. */
function renderMenuInPopover() {
  render(
    <ThemeProvider>
      <div style={{ padding: "2rem" }}>
        <button type="button">Outside</button>
        <Popover
          content={
            <div style={{ width: "14rem" }}>
              <p>Panel text</p>
              <MenuButton label="Actions">
                <Menu.Item>Rename</Menu.Item>
                <Menu.Item>Duplicate</Menu.Item>
                <Menu.Item>Delete</Menu.Item>
              </MenuButton>
            </div>
          }
        >
          <button type="button">Open settings</button>
        </Popover>
      </div>
    </ThemeProvider>,
  );
}

/** Opens the popover, then the menu inside it, and returns the popover's panel. */
async function openMenuInPopover() {
  renderMenuInPopover();
  await userEvent.click(screen.getByRole("button", { name: "Open settings" }));
  const panel = await screen.findByRole("dialog");
  await userEvent.click(triggerButton());
  await screen.findByRole("menu");
  return panel;
}

describe("a Menu, in a browser", () => {
  it("opens on a pointer click with focus on the first row", async () => {
    renderMenuButton();

    await userEvent.click(triggerButton());

    await screen.findByRole("menu");
    await expectFocusOn(items()[0] as HTMLElement);
  });

  it("opens on ArrowDown with focus on the first row", async () => {
    renderMenuButton();
    await focusTrigger();

    await userEvent.keyboard("{ArrowDown}");

    await screen.findByRole("menu");
    await expectFocusOn(items()[0] as HTMLElement);
  });

  it("opens on Enter with focus on the first row", async () => {
    renderMenuButton();
    await focusTrigger();

    await userEvent.keyboard("{Enter}");

    await screen.findByRole("menu");
    await expectFocusOn(items()[0] as HTMLElement);
  });

  it("opens on ArrowUp with focus on the last row", async () => {
    renderMenuButton();
    await focusTrigger();

    await userEvent.keyboard("{ArrowUp}");

    await screen.findByRole("menu");
    await expectFocusOn(items()[2] as HTMLElement);
  });

  it("moves real focus between rows on ArrowDown, ArrowUp, Home and End, wrapping at the ends", async () => {
    renderMenuButton();
    await userEvent.click(triggerButton());
    await screen.findByRole("menu");
    const [rename, duplicate, remove] = items() as [HTMLElement, HTMLElement, HTMLElement];
    await expectFocusOn(rename);

    await userEvent.keyboard("{ArrowDown}");
    await expectFocusOn(duplicate);
    await userEvent.keyboard("{ArrowDown}");
    await expectFocusOn(remove);
    await userEvent.keyboard("{ArrowDown}");
    await expectFocusOn(rename);
    await userEvent.keyboard("{ArrowUp}");
    await expectFocusOn(remove);
    await userEvent.keyboard("{Home}");
    await expectFocusOn(rename);
    await userEvent.keyboard("{End}");
    await expectFocusOn(remove);
  });

  it("returns focus to the trigger when Escape closes it", async () => {
    renderMenuButton();
    await userEvent.click(triggerButton());
    await screen.findByRole("menu");
    await expectFocusOn(items()[0] as HTMLElement);

    await userEvent.keyboard("{Escape}");

    await expect.poll(() => screen.queryByRole("menu")).toBeNull();
    await expectFocusOn(triggerButton());
  });

  it("returns focus to the trigger when a row is selected with a click", async () => {
    renderMenuButton();
    await userEvent.click(triggerButton());
    await screen.findByRole("menu");

    await userEvent.click(screen.getByRole("menuitem", { name: "Duplicate" }));

    await expect.poll(() => screen.queryByRole("menu")).toBeNull();
    await expectFocusOn(triggerButton());
  });

  it("returns focus to the trigger when a row is selected with Enter", async () => {
    renderMenuButton();
    await focusTrigger();
    await userEvent.keyboard("{ArrowDown}");
    await screen.findByRole("menu");
    await expectFocusOn(items()[0] as HTMLElement);

    await userEvent.keyboard("{Enter}");

    await expect.poll(() => screen.queryByRole("menu")).toBeNull();
    await expectFocusOn(triggerButton());
  });

  it("stays shut when its disabled MenuButton is clicked or activated from the keyboard", async () => {
    renderMenuButton({ disabled: true });
    const button = triggerButton();
    expect(button).toHaveProperty("disabled", true);

    // A disabled button takes no pointer events, so the click is forced through the actionability
    // check to land on it the way a real press would.
    await userEvent.click(button, { force: true });
    expect(screen.queryByRole("menu")).toBeNull();

    // A disabled button cannot take focus, so keys reach the body, never the trigger.
    button.focus();
    expect(document.activeElement).not.toBe(button);
    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard(" ");
    await userEvent.keyboard("{ArrowDown}");
    expect(screen.queryByRole("menu")).toBeNull();
  });
});

describe("checkable rows of a Menu, in a browser", () => {
  /** A `MenuButton` holding a checkbox row and a radio group whose state lives in the harness. */
  function CheckableMenu() {
    const [wrap, setWrap] = useState(false);
    const [sort, setSort] = useState("name");
    return (
      <ThemeProvider>
        <div style={{ padding: "2rem" }}>
          <MenuButton label="Actions">
            <Menu.CheckboxItem checked={wrap} onCheckedChange={setWrap}>
              Wrap lines
            </Menu.CheckboxItem>
            <Menu.Group label="Sort by" value={sort} onValueChange={setSort}>
              <Menu.RadioItem value="name">Name</Menu.RadioItem>
              <Menu.RadioItem value="date">Date</Menu.RadioItem>
            </Menu.Group>
          </MenuButton>
        </div>
      </ThemeProvider>
    );
  }

  it("keeps the menu open and focus on a checkbox row when it toggles", async () => {
    render(<CheckableMenu />);
    await userEvent.click(triggerButton());
    await screen.findByRole("menu");
    const checkbox = screen.getByRole("menuitemcheckbox", { name: "Wrap lines" });
    await expectFocusOn(checkbox);

    await userEvent.click(checkbox);
    await expect.poll(() => checkbox.getAttribute("aria-checked")).toBe("true");
    expect(screen.queryByRole("menu")).not.toBeNull();
    await expectFocusOn(checkbox);

    await userEvent.keyboard("{Enter}");
    await expect.poll(() => checkbox.getAttribute("aria-checked")).toBe("false");
    expect(screen.queryByRole("menu")).not.toBeNull();
    await expectFocusOn(checkbox);
  });

  it("closes the menu and returns focus to the trigger when a radio row is selected", async () => {
    render(<CheckableMenu />);
    await userEvent.click(triggerButton());
    await screen.findByRole("menu");

    await userEvent.click(screen.getByRole("menuitemradio", { name: "Date" }));

    await expect.poll(() => screen.queryByRole("menu")).toBeNull();
    await expectFocusOn(triggerButton());

    await userEvent.click(triggerButton());
    await screen.findByRole("menu");
    expect(screen.getByRole("menuitemradio", { name: "Date" }).getAttribute("aria-checked")).toBe("true");
  });
});

describe("a Menu inside a Popover, in a browser", () => {
  it("paints the menu above the popover panel where the two overlap", async () => {
    const panel = await openMenuInPopover();
    const menu = screen.getByRole("menu");

    // Both are portaled into the same `.vpg-root`, so their tokens order them in one stacking
    // context.
    expect(menu.parentElement).toBe(panel.parentElement);
    expect(Number(getComputedStyle(menu).zIndex)).toBeGreaterThan(Number(getComputedStyle(panel).zIndex));

    await expect.poll(() => menu.contains(topmostWhereOverlapping(menu, panel))).toBe(true);
  });

  it("closes only the menu on the first Escape, and the popover on the second", async () => {
    const panel = await openMenuInPopover();

    await userEvent.keyboard("{Escape}");
    await expect.poll(() => screen.queryByRole("menu")).toBeNull();
    expect(screen.queryByRole("dialog")).not.toBeNull();
    await expectFocusOn(triggerButton());
    expect(panel.contains(document.activeElement)).toBe(true);

    await userEvent.keyboard("{Escape}");
    await expect.poll(() => screen.queryByRole("dialog")).toBeNull();
  });

  it("closes the menu alone on a press inside the panel but outside the menu", async () => {
    await openMenuInPopover();

    await userEvent.click(screen.getByText("Panel text"));

    await expect.poll(() => screen.queryByRole("menu")).toBeNull();
    expect(screen.queryByRole("dialog")).not.toBeNull();
  });

  it("closes the menu and the popover together on a press outside both", async () => {
    await openMenuInPopover();

    // The modal focus manager hides everything outside the panel from the accessibility tree, so
    // the button is found by its text rather than its role.
    await userEvent.click(screen.getByText("Outside"));

    await expect.poll(() => screen.queryByRole("menu")).toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
