import { cleanup, render, screen } from "@testing-library/react";
import { Plus } from "@vipengele/react-icons";
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

describe("a row's leading icon, in a browser", () => {
  /** A menu whose one row carries a bare glyph, which brings its own 24-pixel `width`/`height`
   * attributes, as a consumer passing an icon straight from `@vipengele/react-icons` would. */
  async function renderIconRow() {
    render(
      <ThemeProvider>
        <div style={{ padding: "2rem" }}>
          <Menu defaultOpen trigger={<button type="button">Actions</button>}>
            <Menu.Item leadingIcon={<Plus />}>New file</Menu.Item>
          </Menu>
        </div>
      </ThemeProvider>,
    );
    const row = await screen.findByRole("menuitem");
    const slot = row.querySelector(".vpg-menu-item-icon") as HTMLElement;
    const glyph = slot.querySelector("svg") as SVGElement;
    return { row, slot, glyph };
  }

  it("fills the icon box instead of keeping the glyph's own size", async () => {
    const { slot, glyph } = await renderIconRow();

    const box = slot.getBoundingClientRect();
    const drawn = glyph.getBoundingClientRect();
    expect({ width: drawn.width, height: drawn.height }).toEqual({ width: box.width, height: box.height });
  });

  it("is centred on its row", async () => {
    const { row, glyph } = await renderIconRow();

    const rowBox = row.getBoundingClientRect();
    const drawn = glyph.getBoundingClientRect();
    expect(drawn.top + drawn.height / 2).toBeCloseTo(rowBox.top + rowBox.height / 2, 0);
  });
});

describe("a Menu.LinkItem, in a browser", () => {
  /** A menu, opened by a pointer click so focus lands on its first row, of a plain row and a link
   * to `#docs`, optionally disabled, whose clicks are recorded. */
  async function renderLinkMenu({ disabled = false }: { disabled?: boolean } = {}) {
    const clicks: Array<{ ctrlKey: boolean; button: number }> = [];
    const auxclicks: number[] = [];
    render(
      <ThemeProvider>
        <div style={{ padding: "2rem" }}>
          <Menu trigger={<button type="button">Actions</button>}>
            <Menu.Item>Rename</Menu.Item>
            <Menu.LinkItem
              href="#docs"
              disabled={disabled}
              onClick={(event) => {
                clicks.push({ ctrlKey: event.ctrlKey, button: event.button });
              }}
              onAuxClick={(event) => {
                auxclicks.push(event.button);
              }}
            >
              Docs
            </Menu.LinkItem>
          </Menu>
        </div>
      </ThemeProvider>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Actions" }));
    await screen.findByRole("menu");
    return { link: screen.getByRole("menuitem", { name: "Docs" }), clicks, auxclicks };
  }

  /** Records whether each `type` event is default-prevented by the time it bubbles to `document`,
   * after React's root listener has run, and returns that list with the call that stops listening. */
  function recordDefaultPrevented(type: "click" | "auxclick") {
    const prevented: boolean[] = [];
    const listener = (event: Event) => {
      prevented.push(event.defaultPrevented);
    };
    document.addEventListener(type, listener);
    return { prevented, stop: () => document.removeEventListener(type, listener) };
  }

  afterEach(() => {
    window.location.hash = "";
  });

  it("is reached from the first row with ArrowDown", async () => {
    const { link } = await renderLinkMenu();
    await expectFocusOn(items()[0] as HTMLElement);

    await userEvent.keyboard("{ArrowDown}");

    await expectFocusOn(link);
  });

  it("navigates on Enter and closes the menu", async () => {
    const { link } = await renderLinkMenu();
    await expectFocusOn(items()[0] as HTMLElement);
    await userEvent.keyboard("{ArrowDown}");
    await expectFocusOn(link);

    await userEvent.keyboard("{Enter}");

    await expect.poll(() => window.location.hash).toBe("#docs");
    await expect.poll(() => screen.queryByRole("menu")).toBeNull();
  });

  it("navigates on a plain click and closes the menu", async () => {
    const { link, clicks } = await renderLinkMenu();

    await userEvent.click(link);

    await expect.poll(() => window.location.hash).toBe("#docs");
    await expect.poll(() => screen.queryByRole("menu")).toBeNull();
    expect(clicks).toHaveLength(1);
  });

  it("does not navigate or close on Enter when disabled", async () => {
    const { link, clicks } = await renderLinkMenu({ disabled: true });
    await userEvent.keyboard("{ArrowDown}");
    await expectFocusOn(link);

    await userEvent.keyboard("{Enter}");
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

    expect(window.location.hash).toBe("");
    expect(clicks).toHaveLength(0);
    expect(screen.getByRole("menu")).toBeInTheDocument();
  });

  it("cancels the browser's navigation on a plain click and stays open when disabled", async () => {
    const { link, clicks } = await renderLinkMenu({ disabled: true });
    const { prevented, stop } = recordDefaultPrevented("click");

    try {
      // A disabled row is `aria-disabled`, which fails the actionability check, so the click is
      // forced through to land on it the way a real press would.
      await userEvent.click(link, { force: true });
      await expect.poll(() => prevented).toEqual([true]);
    } finally {
      stop();
    }

    expect(window.location.hash).toBe("");
    expect(clicks).toHaveLength(0);
    expect(screen.getByRole("menu")).toBeInTheDocument();
  });

  it("cancels the browser's default action on a middle click and stays open when disabled", async () => {
    const { link, auxclicks } = await renderLinkMenu({ disabled: true });
    const { prevented, stop } = recordDefaultPrevented("auxclick");

    try {
      await userEvent.click(link, { button: "middle", force: true });
      await expect.poll(() => prevented).toEqual([true]);
    } finally {
      stop();
    }

    expect(window.location.hash).toBe("");
    expect(auxclicks).toHaveLength(0);
    expect(screen.getByRole("menu")).toBeInTheDocument();
  });

  it("keeps the menu open on a control-click", async () => {
    const { link, clicks } = await renderLinkMenu();

    await userEvent.click(link, { modifiers: ["Control"] });

    await expect.poll(() => clicks.length).toBe(1);
    expect(clicks[0]?.ctrlKey).toBe(true);
    expect(screen.getByRole("menu")).toBeInTheDocument();
  });

  it("keeps the menu open on a middle click", async () => {
    const { link } = await renderLinkMenu();
    const auxclicks: number[] = [];
    link.addEventListener("auxclick", (event) => {
      event.preventDefault();
      auxclicks.push(event.button);
    });

    await userEvent.click(link, { button: "middle" });

    await expect.poll(() => auxclicks).toEqual([1]);
    expect(screen.getByRole("menu")).toBeInTheDocument();
  });
});
