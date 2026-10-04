import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ChevronDown, Plus } from "@vipengele/react-icons";
import { memo, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { Popover } from "../Popover/Popover.js";
import { Menu } from "./Menu.js";
import { MenuButton } from "./MenuButton.js";

/** Renders a menu inside a `.vpg-root`, the subtree `ThemeProvider` establishes. */
function renderThemed(ui: ReactNode) {
  return render(<div className="vpg-root">{ui}</div>);
}

/** The wrapper `<span>`, which is what carries the click handler. */
function trigger(container: HTMLElement): HTMLElement {
  const wrapper = container.querySelector<HTMLElement>(".vpg-menu-trigger");
  if (wrapper === null) {
    throw new Error("the trigger is not wrapped");
  }
  return wrapper;
}

/** The actual focusable control inside the wrapper. */
function triggerButton(container: HTMLElement): HTMLElement {
  const button = container.querySelector<HTMLElement>(".vpg-menu-trigger button");
  if (button === null) {
    throw new Error("the trigger's button was not found");
  }
  return button;
}

const optionsButton = <button type="button">Options</button>;

const rows = (
  <>
    <Menu.Item>Rename</Menu.Item>
    <Menu.Item>Delete</Menu.Item>
  </>
);

/** The menu's rows, in document order. */
function items(): HTMLElement[] {
  return screen.getAllByRole("menuitem");
}

/** The row whose label is `name`. */
function item(name: string): HTMLElement {
  return screen.getByRole("menuitem", { name });
}

/** Presses `key` on whatever holds focus, as the browser dispatches it. */
function press(key: string) {
  fireEvent.keyDown(document.activeElement as Element, { key });
}

/** Waits for real focus to land on `element`. */
async function expectFocusOn(element: HTMLElement) {
  await waitFor(() => expect(document.activeElement).toBe(element));
}

describe("Menu", () => {
  it("stays closed until the trigger is clicked", () => {
    renderThemed(<Menu trigger={optionsButton}>{rows}</Menu>);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("opens the menu on a trigger click and closes it on the next one", async () => {
    const { container } = renderThemed(<Menu trigger={optionsButton}>{rows}</Menu>);

    fireEvent.click(trigger(container));
    expect(screen.getByRole("menu")).toHaveTextContent("Rename");

    fireEvent.click(trigger(container));
    await waitFor(() => expect(screen.queryByRole("menu")).not.toBeInTheDocument());
  });

  it("renders its children inside the menu panel", () => {
    renderThemed(
      <Menu trigger={optionsButton} defaultOpen>
        {rows}
      </Menu>,
    );

    const menu = screen.getByRole("menu");
    expect(menu).toContainElement(screen.getByText("Rename"));
    expect(menu).toContainElement(screen.getByText("Delete"));
  });

  it("dismisses the menu on an outside press", async () => {
    const { container } = renderThemed(<Menu trigger={optionsButton}>{rows}</Menu>);

    fireEvent.click(trigger(container));
    expect(screen.getByRole("menu")).toBeInTheDocument();

    fireEvent.pointerDown(document.body);
    await waitFor(() => expect(screen.queryByRole("menu")).not.toBeInTheDocument());
  });

  it("dismisses the menu on Escape", async () => {
    const { container } = renderThemed(<Menu trigger={optionsButton}>{rows}</Menu>);

    fireEvent.click(trigger(container));
    expect(screen.getByRole("menu")).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("menu")).not.toBeInTheDocument());
  });

  it("toggles aria-expanded on the trigger's actual control, not the inert wrapper, and marks it as opening a menu", async () => {
    const { container } = renderThemed(<Menu trigger={optionsButton}>{rows}</Menu>);
    const wrapper = trigger(container);
    const button = triggerButton(container);
    expect(button).toHaveAttribute("aria-haspopup", "menu");
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(wrapper).not.toHaveAttribute("aria-haspopup");
    expect(wrapper).not.toHaveAttribute("aria-expanded");

    fireEvent.click(wrapper);
    expect(button).toHaveAttribute("aria-expanded", "true");
    expect(button.getAttribute("aria-controls")).toBe(screen.getByRole("menu").id);
    expect(wrapper).not.toHaveAttribute("aria-controls");

    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(button).toHaveAttribute("aria-expanded", "false"));
    expect(button).not.toHaveAttribute("aria-controls");
  });

  it("falls back to the wrapper's own aria attributes when the trigger isn't a single element", () => {
    const { container } = renderThemed(<Menu trigger={<>Options</>}>{rows}</Menu>);
    const wrapper = trigger(container);
    expect(wrapper).toHaveAttribute("aria-haspopup", "menu");
    expect(wrapper).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(wrapper);
    expect(wrapper).toHaveAttribute("aria-expanded", "true");
    expect(wrapper.getAttribute("aria-controls")).toBe(screen.getByRole("menu").id);
  });

  describe("focus", () => {
    it("moves focus into the menu when it opens", async () => {
      const { container } = renderThemed(<Menu trigger={optionsButton}>{rows}</Menu>);

      fireEvent.click(trigger(container));
      await waitFor(() => expect(screen.getByRole("menu")).toContainElement(document.activeElement as HTMLElement | null));
    });

    it("returns focus to the trigger when the menu closes", async () => {
      const { container } = renderThemed(<Menu trigger={optionsButton}>{rows}</Menu>);

      fireEvent.click(trigger(container));
      await waitFor(() => expect(screen.getByRole("menu")).toContainElement(document.activeElement as HTMLElement | null));

      fireEvent.keyDown(document, { key: "Escape" });
      await waitFor(() => expect(trigger(container)).toContainElement(document.activeElement as HTMLElement | null));
    });
  });

  describe("uncontrolled", () => {
    it("starts open when defaultOpen is set", () => {
      renderThemed(
        <Menu trigger={optionsButton} defaultOpen>
          {rows}
        </Menu>,
      );
      expect(screen.getByRole("menu")).toBeInTheDocument();
    });

    it("reports every open change through onOpenChange while owning the state itself", async () => {
      const onOpenChange = vi.fn();
      const { container } = renderThemed(
        <Menu trigger={optionsButton} onOpenChange={onOpenChange}>
          {rows}
        </Menu>,
      );

      fireEvent.click(trigger(container));
      expect(onOpenChange).toHaveBeenLastCalledWith(true);
      expect(screen.getByRole("menu")).toBeInTheDocument();

      fireEvent.keyDown(document, { key: "Escape" });
      await waitFor(() => expect(onOpenChange).toHaveBeenLastCalledWith(false));
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });
  });

  describe("controlled", () => {
    it("opens and closes only when the open prop changes", () => {
      const { container, rerender } = render(
        <div className="vpg-root">
          <Menu trigger={optionsButton} open={false}>
            {rows}
          </Menu>
        </div>,
      );

      // The trigger still requests a change; without the prop following, nothing opens.
      fireEvent.click(trigger(container));
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();

      rerender(
        <div className="vpg-root">
          <Menu trigger={optionsButton} open>
            {rows}
          </Menu>
        </div>,
      );
      expect(screen.getByRole("menu")).toBeInTheDocument();
    });

    it("reports a dismissal request rather than closing itself", async () => {
      const onOpenChange = vi.fn();
      const { container } = renderThemed(
        <Menu trigger={optionsButton} open onOpenChange={onOpenChange}>
          {rows}
        </Menu>,
      );

      fireEvent.keyDown(document, { key: "Escape" });
      await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
      expect(screen.getByRole("menu")).toBeInTheDocument();

      fireEvent.pointerDown(document.body);
      expect(screen.getByRole("menu")).toBeInTheDocument();

      // A trigger click is a request too: the internal state is never written in the controlled
      // form, so no amount of toggling moves the menu while `open` stays put.
      fireEvent.click(trigger(container));
      expect(screen.getByRole("menu")).toBeInTheDocument();
    });
  });

  describe("portal target", () => {
    it("portals the menu into the nearest .vpg-root rather than the trigger's parent", () => {
      const { container } = renderThemed(
        <div className="trigger-parent">
          <Menu trigger={optionsButton} defaultOpen>
            {rows}
          </Menu>
        </div>,
      );

      const menu = screen.getByRole("menu");
      expect(menu.parentElement).toBe(container.querySelector(".vpg-root"));
      expect(container.querySelector(".trigger-parent")).not.toContainElement(menu);
    });

    it("picks the innermost .vpg-root when themed roots are nested", () => {
      const { container } = renderThemed(
        <div className="vpg-root inner">
          <Menu trigger={optionsButton} defaultOpen>
            {rows}
          </Menu>
        </div>,
      );

      expect(screen.getByRole("menu").parentElement).toBe(container.querySelector(".inner"));
    });

    it("renders the menu inline beside the trigger when there is no .vpg-root ancestor", () => {
      const { container } = render(
        <Menu trigger={optionsButton} defaultOpen>
          {rows}
        </Menu>,
      );

      const menu = screen.getByRole("menu");
      expect(container).toContainElement(menu);
      expect(container.querySelector(".vpg-menu-trigger")).not.toContainElement(menu);
    });

    it("portals the menu into a nearer overlay root rather than the .vpg-root around it", () => {
      const { container } = renderThemed(
        <div data-vpg-overlay-root="" className="overlay-root">
          <Menu trigger={optionsButton} defaultOpen>
            {rows}
          </Menu>
        </div>,
      );

      expect(screen.getByRole("menu").parentElement).toBe(container.querySelector(".overlay-root"));
    });

    it("portals the menu into a farther overlay root even past a nearer .vpg-root", () => {
      const { container } = render(
        <div data-vpg-overlay-root="" className="overlay-root">
          <div className="vpg-root">
            <Menu trigger={optionsButton} defaultOpen>
              {rows}
            </Menu>
          </div>
        </div>,
      );

      expect(screen.getByRole("menu").parentElement).toBe(container.querySelector(".overlay-root"));
    });
  });

  describe("nested overlays", () => {
    it("closes only the menu on Escape when it sits inside a popover's panel", async () => {
      renderThemed(
        <Popover
          content={
            <Menu trigger={optionsButton} defaultOpen>
              {rows}
            </Menu>
          }
          defaultOpen
        >
          <button type="button">Share</button>
        </Popover>,
      );
      expect(document.querySelector(".vpg-menu")).toBeInTheDocument();

      fireEvent.keyDown(document, { key: "Escape" });
      await waitFor(() => expect(document.querySelector(".vpg-menu")).toBeNull());
      expect(document.querySelector(".vpg-popover")).toBeInTheDocument();
    });

    it("closes both the menu and the popover around it on an outside press", async () => {
      renderThemed(
        <Popover
          content={
            <Menu trigger={optionsButton} defaultOpen>
              {rows}
            </Menu>
          }
          defaultOpen
        >
          <button type="button">Share</button>
        </Popover>,
      );
      expect(document.querySelector(".vpg-menu")).toBeInTheDocument();

      fireEvent.pointerDown(document.body);
      await waitFor(() => expect(document.querySelector(".vpg-popover")).toBeNull());
      expect(document.querySelector(".vpg-menu")).toBeNull();
    });
  });

  describe("keyboard navigation", () => {
    const fileRows = (
      <>
        <Menu.Item>Rename</Menu.Item>
        <Menu.Item>Duplicate</Menu.Item>
        <Menu.Item>Delete</Menu.Item>
      </>
    );

    /** Focuses the trigger's button and opens the menu with `ArrowDown`, settled on the first row. */
    async function openWithArrowDown(container: HTMLElement) {
      triggerButton(container).focus();
      press("ArrowDown");
      await expectFocusOn(items()[0] as HTMLElement);
    }

    it("opens on the first row on ArrowDown", async () => {
      const { container } = renderThemed(<Menu trigger={optionsButton}>{fileRows}</Menu>);

      await openWithArrowDown(container);
      expect(document.activeElement).toBe(item("Rename"));
    });

    it("opens on the last row on ArrowUp", async () => {
      const { container } = renderThemed(<Menu trigger={optionsButton}>{fileRows}</Menu>);

      triggerButton(container).focus();
      press("ArrowUp");
      await expectFocusOn(item("Delete"));
    });

    it.each([
      ["Enter", "Enter"],
      ["Space", " "],
    ])("opens on the first row on %s", async (_name, key) => {
      const { container } = renderThemed(<Menu trigger={optionsButton}>{fileRows}</Menu>);
      const button = triggerButton(container);

      // The browser follows the key with a click on the focused button, whose `detail` of 0 marks
      // it as keyboard-made.
      button.focus();
      press(key);
      fireEvent.click(button, { detail: 0 });
      await expectFocusOn(item("Rename"));
    });

    it("opens on the first row on a pointer click", async () => {
      const { container } = renderThemed(<Menu trigger={optionsButton}>{fileRows}</Menu>);

      // A non-zero `detail` is what marks a click as made by a pointer rather than a key.
      fireEvent.pointerDown(trigger(container), { pointerType: "mouse" });
      fireEvent.click(trigger(container), { detail: 1 });
      await expectFocusOn(item("Rename"));
    });

    it("moves focus down and up one row at a time", async () => {
      const { container } = renderThemed(<Menu trigger={optionsButton}>{fileRows}</Menu>);
      await openWithArrowDown(container);

      press("ArrowDown");
      await expectFocusOn(item("Duplicate"));
      press("ArrowDown");
      await expectFocusOn(item("Delete"));
      press("ArrowUp");
      await expectFocusOn(item("Duplicate"));
    });

    it("wraps from the last row to the first on ArrowDown, and back on ArrowUp", async () => {
      const { container } = renderThemed(<Menu trigger={optionsButton}>{fileRows}</Menu>);
      await openWithArrowDown(container);

      press("ArrowUp");
      await expectFocusOn(item("Delete"));
      press("ArrowDown");
      await expectFocusOn(item("Rename"));
    });

    it("jumps to the last row on End and the first on Home", async () => {
      const { container } = renderThemed(<Menu trigger={optionsButton}>{fileRows}</Menu>);
      await openWithArrowDown(container);

      press("End");
      await expectFocusOn(item("Delete"));
      press("Home");
      await expectFocusOn(item("Rename"));
    });

    it("gives the focused row the only tab stop", async () => {
      const { container } = renderThemed(<Menu trigger={optionsButton}>{fileRows}</Menu>);
      await openWithArrowDown(container);
      expect(items().map((row) => row.tabIndex)).toEqual([0, -1, -1]);

      press("ArrowDown");
      await expectFocusOn(item("Duplicate"));
      expect(items().map((row) => row.tabIndex)).toEqual([-1, 0, -1]);
    });
  });

  describe("typeahead", () => {
    const fileRows = (
      <>
        <Menu.Item>Rename</Menu.Item>
        <Menu.Item>Delete</Menu.Item>
        <Menu.Item>Duplicate</Menu.Item>
        <Menu.Item>Save</Menu.Item>
        <Menu.Item>Save as</Menu.Item>
      </>
    );

    async function openMenu(container: HTMLElement) {
      fireEvent.click(trigger(container));
      await expectFocusOn(item("Rename"));
    }

    it("jumps to the next row starting with a typed character", async () => {
      const { container } = renderThemed(<Menu trigger={optionsButton}>{fileRows}</Menu>);
      await openMenu(container);

      press("d");
      await expectFocusOn(item("Delete"));
    });

    it("matches every character typed within the timeout, not only the first", async () => {
      const { container } = renderThemed(<Menu trigger={optionsButton}>{fileRows}</Menu>);
      await openMenu(container);

      press("d");
      press("u");
      await expectFocusOn(item("Duplicate"));
    });

    it("leaves focus where it is when nothing matches", async () => {
      const { container } = renderThemed(<Menu trigger={optionsButton}>{fileRows}</Menu>);
      await openMenu(container);

      press("z");
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(document.activeElement).toBe(item("Rename"));
    });

    it("reads Space typed mid-string as part of the string rather than as activation", async () => {
      const onSelect = vi.fn();
      const { container } = renderThemed(
        <Menu trigger={optionsButton}>
          <Menu.Item>Rename</Menu.Item>
          <Menu.Item onSelect={onSelect}>Save</Menu.Item>
          <Menu.Item>Save as</Menu.Item>
        </Menu>,
      );
      await openMenu(container);

      for (const key of ["s", "a", "v", "e"]) {
        press(key);
      }
      await expectFocusOn(item("Save"));
      press(" ");
      await expectFocusOn(item("Save as"));
      expect(onSelect).not.toHaveBeenCalled();
      expect(screen.getByRole("menu")).toBeInTheDocument();
    });

    it("matches nothing while the menu is shut, so the menu still opens on its first row", async () => {
      const { container } = renderThemed(<Menu trigger={optionsButton}>{fileRows}</Menu>);
      await openMenu(container);
      press("Escape");
      await expectFocusOn(triggerButton(container));

      press("d");
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();

      fireEvent.click(trigger(container));
      await expectFocusOn(item("Rename"));
    });
  });

  describe("selection", () => {
    it.each([
      ["a click", (row: HTMLElement) => fireEvent.click(row)],
      ["Enter", (row: HTMLElement) => fireEvent.keyDown(row, { key: "Enter" })],
      ["Space", (row: HTMLElement) => fireEvent.keyDown(row, { key: " " })],
    ])("fires onSelect once on %s, closes the menu and returns focus to the trigger", async (_name, activate) => {
      const onSelect = vi.fn();
      const { container } = renderThemed(
        <Menu trigger={optionsButton}>
          <Menu.Item onSelect={onSelect}>Rename</Menu.Item>
          <Menu.Item>Delete</Menu.Item>
        </Menu>,
      );
      const button = triggerButton(container);
      button.focus();
      press("ArrowDown");
      await expectFocusOn(item("Rename"));

      activate(item("Rename"));
      expect(onSelect).toHaveBeenCalledTimes(1);
      await waitFor(() => expect(screen.queryByRole("menu")).not.toBeInTheDocument());
      await expectFocusOn(button);
    });

    it("closes the menu on activating a row without an onSelect", async () => {
      const { container } = renderThemed(<Menu trigger={optionsButton}>{rows}</Menu>);
      fireEvent.click(trigger(container));
      await expectFocusOn(item("Rename"));

      fireEvent.click(item("Rename"));
      await waitFor(() => expect(screen.queryByRole("menu")).not.toBeInTheDocument());
    });

    it("ignores keys on a row other than Enter and Space", async () => {
      const onSelect = vi.fn();
      const { container } = renderThemed(
        <Menu trigger={optionsButton}>
          <Menu.Item onSelect={onSelect}>Rename</Menu.Item>
        </Menu>,
      );
      fireEvent.click(trigger(container));
      await expectFocusOn(item("Rename"));

      fireEvent.keyDown(item("Rename"), { key: "Tab" });
      expect(onSelect).not.toHaveBeenCalled();
      expect(screen.getByRole("menu")).toBeInTheDocument();
    });
  });

  describe("disabled rows", () => {
    function renderWithDisabled(onSelect = vi.fn()) {
      return renderThemed(
        <Menu trigger={optionsButton}>
          <Menu.Item>Rename</Menu.Item>
          <Menu.Item disabled onSelect={onSelect}>
            Archive
          </Menu.Item>
          <Menu.Item>Delete</Menu.Item>
        </Menu>,
      );
    }

    it("marks a disabled row aria-disabled and leaves the others unmarked", () => {
      const { container } = renderWithDisabled();
      fireEvent.click(trigger(container));

      expect(item("Archive")).toHaveAttribute("aria-disabled", "true");
      expect(item("Rename")).not.toHaveAttribute("aria-disabled");
    });

    it("keeps a disabled row a stop for the arrow keys and typeahead", async () => {
      const { container } = renderWithDisabled();
      fireEvent.click(trigger(container));
      await expectFocusOn(item("Rename"));

      press("ArrowDown");
      await expectFocusOn(item("Archive"));
      press("Home");
      await expectFocusOn(item("Rename"));
      press("a");
      await expectFocusOn(item("Archive"));
    });

    it.each([
      ["a click", (row: HTMLElement) => fireEvent.click(row)],
      ["Enter", (row: HTMLElement) => fireEvent.keyDown(row, { key: "Enter" })],
      ["Space", (row: HTMLElement) => fireEvent.keyDown(row, { key: " " })],
    ])("neither fires onSelect nor closes the menu on %s", async (_name, activate) => {
      const onSelect = vi.fn();
      const { container } = renderWithDisabled(onSelect);
      fireEvent.click(trigger(container));
      await expectFocusOn(item("Rename"));

      activate(item("Archive"));
      expect(onSelect).not.toHaveBeenCalled();
      expect(screen.getByRole("menu")).toBeInTheDocument();
    });
  });

  describe("separators and groups", () => {
    function renderStructured() {
      return renderThemed(
        <Menu trigger={optionsButton}>
          <Menu.Group label="Edit">
            <Menu.Item>Cut</Menu.Item>
            <Menu.Item>Copy</Menu.Item>
          </Menu.Group>
          <Menu.Separator />
          <Menu.Item>Paste</Menu.Item>
        </Menu>,
      );
    }

    it("renders a separator and a group named by its heading", () => {
      const { container } = renderStructured();
      fireEvent.click(trigger(container));

      expect(screen.getByRole("separator")).toHaveClass("vpg-menu-separator");
      const group = screen.getByRole("group", { name: "Edit" });
      expect(group).toContainElement(item("Cut"));
      expect(group).toContainElement(item("Copy"));
      expect(group).not.toContainElement(item("Paste"));
    });

    it("steps over separators and group headings with the arrow keys", async () => {
      const { container } = renderStructured();
      triggerButton(container).focus();
      press("ArrowDown");
      await expectFocusOn(item("Cut"));

      press("ArrowDown");
      await expectFocusOn(item("Copy"));
      press("ArrowDown");
      await expectFocusOn(item("Paste"));
      press("ArrowDown");
      await expectFocusOn(item("Cut"));
      expect(items()).toHaveLength(3);
    });

    it("never matches a group heading with typeahead", async () => {
      const { container } = renderStructured();
      fireEvent.click(trigger(container));
      await expectFocusOn(item("Cut"));

      press("e");
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(document.activeElement).toBe(item("Cut"));
    });

    it("leaves separators and group headings out of the tab order", () => {
      const { container } = renderStructured();
      fireEvent.click(trigger(container));

      expect(screen.getByRole("separator")).not.toHaveAttribute("tabindex");
      expect(screen.getByText("Edit")).not.toHaveAttribute("tabindex");
    });
  });

  describe("Menu.Item", () => {
    it("renders a leading icon hidden from assistive tech and a trailing shortcut", () => {
      const { container } = renderThemed(
        <Menu trigger={optionsButton}>
          <Menu.Item leadingIcon={<svg data-testid="icon" />} shortcut="⌘R">
            Rename
          </Menu.Item>
        </Menu>,
      );
      fireEvent.click(trigger(container));

      const row = screen.getByRole("menuitem");
      expect(row.querySelector(".vpg-menu-item-icon")).toHaveAttribute("aria-hidden", "true");
      expect(row.querySelector(".vpg-menu-item-icon")).toContainElement(screen.getByTestId("icon"));
      expect(row.querySelector(".vpg-menu-item-label")).toHaveTextContent("Rename");
      expect(row.querySelector(".vpg-menu-item-shortcut")).toHaveTextContent("⌘R");
    });

    it("renders neither slot when no icon or shortcut is given", () => {
      const { container } = renderThemed(<Menu trigger={optionsButton}>{rows}</Menu>);
      fireEvent.click(trigger(container));

      expect(item("Rename").querySelector(".vpg-menu-item-icon")).toBeNull();
      expect(item("Rename").querySelector(".vpg-menu-item-shortcut")).toBeNull();
    });

    it("throws when rendered outside a Menu", () => {
      // React logs the error it rethrows; silence it so the expected throw doesn't read as a failure.
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
      expect(() => render(<Menu.Item>Rename</Menu.Item>)).toThrow("Menu.Item must be rendered inside <Menu>.");
      consoleError.mockRestore();
    });
  });

  describe("Menu.CheckboxItem", () => {
    function checkbox(name: string): HTMLElement {
      return screen.getByRole("menuitemcheckbox", { name });
    }

    function renderView(onCheckedChange = vi.fn(), gridChecked = false) {
      return renderThemed(
        <Menu trigger={optionsButton}>
          <Menu.CheckboxItem checked={gridChecked} onCheckedChange={onCheckedChange}>
            Show grid lines
          </Menu.CheckboxItem>
          <Menu.CheckboxItem checked onCheckedChange={vi.fn()}>
            Show rulers
          </Menu.CheckboxItem>
        </Menu>,
      );
    }

    it("reflects the checked prop in aria-checked and a check mark hidden from assistive tech", () => {
      const { container, rerender } = renderView();
      fireEvent.click(trigger(container));

      expect(checkbox("Show grid lines")).toHaveAttribute("aria-checked", "false");
      expect(checkbox("Show grid lines").querySelector(".vpg-menu-item-indicator")).toBeEmptyDOMElement();
      expect(checkbox("Show rulers")).toHaveAttribute("aria-checked", "true");
      const indicator = checkbox("Show rulers").querySelector(".vpg-menu-item-indicator");
      expect(indicator).toHaveAttribute("aria-hidden", "true");
      expect(indicator?.querySelector("svg.vpg-menu-item-check")).not.toBeNull();

      rerender(
        <div className="vpg-root">
          <Menu trigger={optionsButton}>
            <Menu.CheckboxItem checked onCheckedChange={vi.fn()}>
              Show grid lines
            </Menu.CheckboxItem>
          </Menu>
        </div>,
      );
      expect(checkbox("Show grid lines")).toHaveAttribute("aria-checked", "true");
    });

    it.each([
      ["a click", (row: HTMLElement) => fireEvent.click(row)],
      ["Enter", (row: HTMLElement) => fireEvent.keyDown(row, { key: "Enter" })],
      ["Space", (row: HTMLElement) => fireEvent.keyDown(row, { key: " " })],
    ])("reports the toggled state on %s and keeps the menu open", async (_name, activate) => {
      const onCheckedChange = vi.fn();
      const { container } = renderView(onCheckedChange);
      fireEvent.click(trigger(container));
      await expectFocusOn(checkbox("Show grid lines"));

      activate(checkbox("Show grid lines"));
      expect(onCheckedChange).toHaveBeenCalledExactlyOnceWith(true);
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(screen.getByRole("menu")).toBeInTheDocument();
      expect(document.activeElement).toBe(checkbox("Show grid lines"));
    });

    it("reports false when a checked row is activated", () => {
      const onCheckedChange = vi.fn();
      const { container } = renderView(onCheckedChange, true);
      fireEvent.click(trigger(container));

      fireEvent.click(checkbox("Show grid lines"));
      expect(onCheckedChange).toHaveBeenCalledExactlyOnceWith(false);
    });

    it("stays focusable but inert while disabled", async () => {
      const onCheckedChange = vi.fn();
      const { container } = renderThemed(
        <Menu trigger={optionsButton}>
          <Menu.Item>Rename</Menu.Item>
          <Menu.CheckboxItem checked={false} onCheckedChange={onCheckedChange} disabled>
            Show grid lines
          </Menu.CheckboxItem>
        </Menu>,
      );
      fireEvent.click(trigger(container));
      await expectFocusOn(item("Rename"));

      press("ArrowDown");
      await expectFocusOn(checkbox("Show grid lines"));
      expect(checkbox("Show grid lines")).toHaveAttribute("aria-disabled", "true");

      fireEvent.click(checkbox("Show grid lines"));
      fireEvent.keyDown(checkbox("Show grid lines"), { key: "Enter" });
      fireEvent.keyDown(checkbox("Show grid lines"), { key: " " });
      expect(onCheckedChange).not.toHaveBeenCalled();
      expect(screen.getByRole("menu")).toBeInTheDocument();
    });

    it("renders a leading icon and a shortcut as a plain row does", () => {
      const { container } = renderThemed(
        <Menu trigger={optionsButton}>
          <Menu.CheckboxItem checked onCheckedChange={vi.fn()} leadingIcon={<svg data-testid="icon" />} shortcut="⌘G">
            Show grid lines
          </Menu.CheckboxItem>
        </Menu>,
      );
      fireEvent.click(trigger(container));

      const row = screen.getByRole("menuitemcheckbox");
      expect(row.querySelector(".vpg-menu-item-icon")).toContainElement(screen.getByTestId("icon"));
      expect(row.querySelector(".vpg-menu-item-shortcut")).toHaveTextContent("⌘G");
    });

    it("throws when rendered outside a Menu", () => {
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
      expect(() =>
        render(
          <Menu.CheckboxItem checked={false} onCheckedChange={vi.fn()}>
            Show grid lines
          </Menu.CheckboxItem>,
        ),
      ).toThrow("Menu.CheckboxItem must be rendered inside <Menu>.");
      consoleError.mockRestore();
    });
  });

  describe("Menu.RadioItem", () => {
    function radio(name: string): HTMLElement {
      return screen.getByRole("menuitemradio", { name });
    }

    function sortMenu(value: string | undefined, onValueChange?: (value: string) => void) {
      return (
        <Menu trigger={optionsButton}>
          <Menu.Group label="Sort by" value={value} onValueChange={onValueChange}>
            <Menu.RadioItem value="name">Name</Menu.RadioItem>
            <Menu.RadioItem value="date">Date</Menu.RadioItem>
          </Menu.Group>
        </Menu>
      );
    }

    it("checks the row whose value the group holds, with a dot hidden from assistive tech", () => {
      const { container, rerender } = renderThemed(sortMenu("name"));
      fireEvent.click(trigger(container));

      expect(radio("Name")).toHaveAttribute("aria-checked", "true");
      expect(radio("Date")).toHaveAttribute("aria-checked", "false");
      const indicator = radio("Name").querySelector(".vpg-menu-item-indicator");
      expect(indicator).toHaveAttribute("aria-hidden", "true");
      expect(indicator?.querySelector(".vpg-menu-item-radio-dot")).not.toBeNull();
      expect(radio("Date").querySelector(".vpg-menu-item-indicator")).toBeEmptyDOMElement();

      rerender(<div className="vpg-root">{sortMenu("date")}</div>);
      expect(radio("Name")).toHaveAttribute("aria-checked", "false");
      expect(radio("Date")).toHaveAttribute("aria-checked", "true");
    });

    it("checks no row while the group holds no value", () => {
      const { container } = renderThemed(sortMenu(undefined));
      fireEvent.click(trigger(container));

      expect(screen.getAllByRole("menuitemradio").map((row) => row.getAttribute("aria-checked"))).toEqual(["false", "false"]);
    });

    it.each([
      ["a click", (row: HTMLElement) => fireEvent.click(row)],
      ["Enter", (row: HTMLElement) => fireEvent.keyDown(row, { key: "Enter" })],
      ["Space", (row: HTMLElement) => fireEvent.keyDown(row, { key: " " })],
    ])("reports its value to the group on %s and closes the menu", async (_name, activate) => {
      const onValueChange = vi.fn();
      const { container } = renderThemed(sortMenu("name", onValueChange));
      fireEvent.click(trigger(container));
      await expectFocusOn(radio("Name"));

      activate(radio("Date"));
      expect(onValueChange).toHaveBeenCalledExactlyOnceWith("date");
      await waitFor(() => expect(screen.queryByRole("menu")).not.toBeInTheDocument());
    });

    it("closes the menu when its group has no onValueChange", async () => {
      const { container } = renderThemed(sortMenu("name"));
      fireEvent.click(trigger(container));

      fireEvent.click(radio("Date"));
      await waitFor(() => expect(screen.queryByRole("menu")).not.toBeInTheDocument());
    });

    it("stays focusable but inert while disabled", async () => {
      const onValueChange = vi.fn();
      const { container } = renderThemed(
        <Menu trigger={optionsButton}>
          <Menu.Group label="Sort by" value="name" onValueChange={onValueChange}>
            <Menu.RadioItem value="name">Name</Menu.RadioItem>
            <Menu.RadioItem value="date" disabled>
              Date
            </Menu.RadioItem>
          </Menu.Group>
        </Menu>,
      );
      fireEvent.click(trigger(container));
      await expectFocusOn(radio("Name"));

      press("ArrowDown");
      await expectFocusOn(radio("Date"));
      expect(radio("Date")).toHaveAttribute("aria-disabled", "true");

      fireEvent.click(radio("Date"));
      fireEvent.keyDown(radio("Date"), { key: "Enter" });
      fireEvent.keyDown(radio("Date"), { key: " " });
      expect(onValueChange).not.toHaveBeenCalled();
      expect(screen.getByRole("menu")).toBeInTheDocument();
    });

    it("throws when rendered in a Menu outside a Menu.Group", () => {
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
      expect(() =>
        renderThemed(
          <Menu trigger={optionsButton} defaultOpen>
            <Menu.RadioItem value="name">Name</Menu.RadioItem>
          </Menu>,
        ),
      ).toThrow("Menu.RadioItem must be rendered inside <Menu.Group>.");
      consoleError.mockRestore();
    });

    it("throws when rendered outside a Menu", () => {
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
      expect(() => render(<Menu.RadioItem value="name">Name</Menu.RadioItem>)).toThrow("Menu.RadioItem must be rendered inside <Menu>.");
      consoleError.mockRestore();
    });
  });

  describe("child validation", () => {
    function Custom() {
      return null;
    }
    // `memo` returns an object rather than a function, so the element's type carries no name.
    const Unnamed = memo(() => null);

    it("accepts every row kind, in fragments and behind conditions, at the top level and in a group", () => {
      const hidden = false as boolean;
      const leadingRows = (
        <>
          <Menu.Item>Rename</Menu.Item>
          {hidden ? <Menu.Item>Hidden</Menu.Item> : null}
        </>
      );
      const radioRows = (
        <>
          <Menu.RadioItem value="name">Name</Menu.RadioItem>
          <Menu.Separator />
        </>
      );
      renderThemed(
        <Menu trigger={optionsButton} defaultOpen>
          {leadingRows}
          <Menu.CheckboxItem checked={false} onCheckedChange={vi.fn()}>
            Show grid lines
          </Menu.CheckboxItem>
          <Menu.Separator />
          <Menu.Group label="Sort by" value="name">
            {radioRows}
            <Menu.Item>Reset</Menu.Item>
            <Menu.CheckboxItem checked onCheckedChange={vi.fn()}>
              Descending
            </Menu.CheckboxItem>
          </Menu.Group>
        </Menu>,
      );

      expect(screen.getAllByRole("menuitem")).toHaveLength(2);
      expect(screen.getAllByRole("menuitemcheckbox")).toHaveLength(2);
      expect(screen.getAllByRole("menuitemradio")).toHaveLength(1);
    });

    it.each([
      ["an intrinsic element", <div key="x">Rename</div>, "<div>"],
      ["a named component", <Custom key="x" />, "<Custom>"],
      ["an unnamed component", <Unnamed key="x" />, "an unnamed component"],
      ["text", "Rename", 'the text "Rename"'],
    ])("throws on %s inside a Menu, naming it", (_name, child, named) => {
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
      expect(() => renderThemed(<Menu trigger={optionsButton}>{child}</Menu>)).toThrow(
        `<Menu> accepts only Menu.Item, Menu.CheckboxItem, Menu.RadioItem, Menu.Separator and Menu.Group as children, but received ${named}.`,
      );
      consoleError.mockRestore();
    });

    it("throws on an unknown child nested in a fragment inside a Menu", () => {
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
      const fragmentRows = (
        <>
          <Menu.Item>Rename</Menu.Item>
          <span>Delete</span>
        </>
      );
      expect(() => renderThemed(<Menu trigger={optionsButton}>{fragmentRows}</Menu>)).toThrow("but received <span>.");
      consoleError.mockRestore();
    });

    it("throws on an unknown child inside a Menu.Group, even while the menu is shut", () => {
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
      expect(() =>
        renderThemed(
          <Menu trigger={optionsButton}>
            <Menu.Group label="Edit">
              <Menu.Item>Cut</Menu.Item>
              <button type="button">Copy</button>
            </Menu.Group>
          </Menu>,
        ),
      ).toThrow(
        "<Menu.Group> accepts only Menu.Item, Menu.CheckboxItem, Menu.RadioItem and Menu.Separator (groups do not nest) as children, but received <button>.",
      );
      consoleError.mockRestore();
    });

    it("throws on a Menu.Group nested inside a Menu.Group", () => {
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
      expect(() =>
        renderThemed(
          <Menu trigger={optionsButton} defaultOpen>
            <Menu.Group label="Edit">
              <Menu.Group label="Clipboard">
                <Menu.Item>Cut</Menu.Item>
              </Menu.Group>
            </Menu.Group>
          </Menu>,
        ),
      ).toThrow(
        "<Menu.Group> accepts only Menu.Item, Menu.CheckboxItem, Menu.RadioItem and Menu.Separator (groups do not nest) as children, but received <MenuGroup>.",
      );
      consoleError.mockRestore();
    });
  });

  describe("MenuButton", () => {
    it("renders a Button trigger showing its label, marked as opening a menu", () => {
      const { container } = renderThemed(<MenuButton label="Options">{rows}</MenuButton>);

      const button = screen.getByRole("button", { name: "Options" });
      expect(button).toHaveClass("vpg-button", "vpg-button-primary", "vpg-button-md");
      expect(trigger(container)).toContainElement(button);
      expect(button).toHaveAttribute("aria-haspopup", "menu");
      expect(button).toHaveAttribute("aria-expanded", "false");
    });

    it("forwards the Button props to its trigger", () => {
      const { container } = renderThemed(
        <MenuButton label="Options" variant="ghost" size="sm" leadingIcon={Plus} trailingIcon={ChevronDown} disabled>
          {rows}
        </MenuButton>,
      );

      const button = triggerButton(container);
      expect(button).toHaveClass("vpg-button-ghost", "vpg-button-sm");
      expect(button).toBeDisabled();
      expect(button.querySelectorAll("svg.vpg-button-icon")).toHaveLength(2);
    });

    it("opens its menu on a click, and its rows work as a Menu's do", async () => {
      const onSelect = vi.fn();
      const onOpenChange = vi.fn();
      const { container } = renderThemed(
        <MenuButton label="Options" className="custom" onOpenChange={onOpenChange}>
          <Menu.Item onSelect={onSelect}>Rename</Menu.Item>
          <Menu.Item>Delete</Menu.Item>
        </MenuButton>,
      );

      fireEvent.click(triggerButton(container));
      expect(onOpenChange).toHaveBeenLastCalledWith(true);
      expect(screen.getByRole("menu")).toHaveClass("vpg-menu", "custom");
      expect(triggerButton(container)).toHaveAttribute("aria-expanded", "true");
      await expectFocusOn(item("Rename"));

      fireEvent.keyDown(item("Rename"), { key: "Enter" });
      expect(onSelect).toHaveBeenCalledTimes(1);
      await waitFor(() => expect(screen.queryByRole("menu")).not.toBeInTheDocument());
      await expectFocusOn(triggerButton(container));
    });

    it("passes the open state through to its menu", () => {
      renderThemed(
        <MenuButton label="Options" open>
          {rows}
        </MenuButton>,
      );
      expect(screen.getByRole("menu")).toBeInTheDocument();
    });
  });

  it("composes a caller-supplied className onto the panel", () => {
    renderThemed(
      <Menu trigger={optionsButton} className="custom" defaultOpen>
        {rows}
      </Menu>,
    );

    expect(screen.getByRole("menu")).toHaveClass("vpg-menu", "custom");
  });

  describe("stylesheet", () => {
    it("injects its stylesheet once for any number of menus", () => {
      renderThemed(
        <>
          <Menu trigger={optionsButton}>{rows}</Menu>
          <Menu trigger={<button type="button">More</button>}>{rows}</Menu>
        </>,
      );

      // React hoists the style into `<head>` and rewrites `href`/`precedence` to
      // `data-href`/`data-precedence`, keyed on `href` for de-duplication.
      const styles = document.head.querySelectorAll('style[data-href="vpg-menu"]');
      expect(styles).toHaveLength(1);
      expect(styles[0]?.textContent).toContain(".vpg-menu {");
      expect(styles[0]?.textContent).toContain("z-index: var(--vpg-layer-menu);");
    });

    it("never assigns a --vpg-* custom property inline", () => {
      const { container } = renderThemed(
        <Menu trigger={optionsButton} className="custom" defaultOpen>
          {rows}
        </Menu>,
      );

      // An inline custom property would beat the base stylesheet's dark-mode reassignment on the
      // same element, so this instance would stop adapting to colour mode. Floating-ui's computed
      // coordinates are plain CSS properties and are expected here.
      expect(screen.getByRole("menu").getAttribute("style")).not.toContain("--vpg-");
      expect(container.querySelector(".vpg-menu-trigger")?.getAttribute("style")).toBeNull();
    });
  });
});
