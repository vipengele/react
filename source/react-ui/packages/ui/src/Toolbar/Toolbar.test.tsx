import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { createPortal } from "react-dom";
import { describe, expect, it, vi } from "vitest";
import { Button } from "../Button/Button.js";
import { ButtonGroup } from "../ButtonGroup/ButtonGroup.js";
import { Menu } from "../Menu/Menu.js";
import { MenuButton } from "../Menu/MenuButton.js";
import { Toolbar } from "./Toolbar.js";
import { toolbarStylesheet } from "./Toolbar.stylesheet.js";

function button(name: string) {
  return screen.getByRole("button", { name });
}

/** The `tabindex` attribute of each named button, in the order given. */
function tabIndexes(...names: string[]) {
  return names.map((name) => button(name).getAttribute("tabindex"));
}

/** Presses `key` on whatever has focus and reports whether the toolbar prevented its default. */
function press(key: string): boolean {
  return !fireEvent.keyDown(document.activeElement as Element, { key });
}

function focus(element: HTMLElement) {
  act(() => element.focus());
}

describe("Toolbar", () => {
  describe("semantics", () => {
    it("renders a toolbar with a horizontal orientation by default", () => {
      render(<Toolbar aria-label="Formatting" />);
      const toolbar = screen.getByRole("toolbar", { name: "Formatting" });
      expect(toolbar).toHaveAttribute("aria-orientation", "horizontal");
      expect(toolbar).toHaveClass("vpg-toolbar", "vpg-toolbar-horizontal");
    });

    it("renders the vertical orientation", () => {
      render(<Toolbar orientation="vertical" />);
      const toolbar = screen.getByRole("toolbar");
      expect(toolbar).toHaveAttribute("aria-orientation", "vertical");
      expect(toolbar).toHaveClass("vpg-toolbar", "vpg-toolbar-vertical");
    });

    it("takes its name from aria-labelledby", () => {
      render(
        <>
          <span id="toolbar-heading">Text styles</span>
          <Toolbar aria-labelledby="toolbar-heading" />
        </>,
      );
      expect(screen.getByRole("toolbar", { name: "Text styles" })).toBeInTheDocument();
    });

    it("composes a caller-supplied className and forwards arbitrary attributes", () => {
      render(<Toolbar className="custom" data-testid="target" id="tools" />);
      const toolbar = screen.getByTestId("target");
      expect(toolbar).toHaveClass("custom", "vpg-toolbar");
      expect(toolbar).toHaveAttribute("id", "tools");
    });
  });

  describe("tab stop", () => {
    it("makes the first item the only tab stop before any item has been focused", () => {
      render(
        <Toolbar>
          <Button>Bold</Button>
          <Button>Italic</Button>
          <a href="#docs">Docs</a>
        </Toolbar>,
      );
      expect(tabIndexes("Bold", "Italic")).toEqual(["0", "-1"]);
      expect(screen.getByRole("link", { name: "Docs" })).toHaveAttribute("tabindex", "-1");
    });

    it("moves the tab stop to the item focused last", () => {
      render(
        <Toolbar>
          <Button>Bold</Button>
          <Button>Italic</Button>
        </Toolbar>,
      );
      focus(button("Italic"));
      expect(tabIndexes("Bold", "Italic")).toEqual(["-1", "0"]);

      focus(button("Bold"));
      expect(tabIndexes("Bold", "Italic")).toEqual(["0", "-1"]);
    });

    it("treats the buttons of a nested ButtonGroup as items of their own", () => {
      render(
        <Toolbar>
          <Button>Undo</Button>
          <ButtonGroup>
            <Button>Left</Button>
            <Button>Center</Button>
          </ButtonGroup>
        </Toolbar>,
      );
      expect(tabIndexes("Undo", "Left", "Center")).toEqual(["0", "-1", "-1"]);
      expect(screen.getByRole("group")).not.toHaveAttribute("tabindex");

      focus(button("Undo"));
      press("ArrowRight");
      expect(button("Left")).toHaveFocus();
      press("ArrowRight");
      expect(button("Center")).toHaveFocus();
      expect(tabIndexes("Undo", "Left", "Center")).toEqual(["-1", "-1", "0"]);
    });

    it("treats a MenuButton's inner button as the item, not its wrapper", () => {
      render(
        <Toolbar>
          <Button>Bold</Button>
          <MenuButton label="Insert">
            <Menu.Item>Table</Menu.Item>
          </MenuButton>
        </Toolbar>,
      );
      const insert = button("Insert");
      expect(insert).toHaveAttribute("tabindex", "-1");
      expect(insert.closest(".vpg-menu-trigger")).not.toHaveAttribute("tabindex");

      focus(button("Bold"));
      press("ArrowRight");
      expect(insert).toHaveFocus();
      expect(insert).toHaveAttribute("tabindex", "0");
    });

    it("skips a natively disabled item, which gets no tab stop", () => {
      render(
        <Toolbar>
          <Button disabled>Cut</Button>
          <Button>Copy</Button>
        </Toolbar>,
      );
      expect(tabIndexes("Cut", "Copy")).toEqual([null, "0"]);
    });

    it("keeps an aria-disabled item focusable and reachable by the arrows", () => {
      render(
        <Toolbar>
          <Button>Copy</Button>
          <Button aria-disabled>Paste</Button>
          <Button>Delete</Button>
        </Toolbar>,
      );
      expect(button("Paste")).toHaveAttribute("tabindex", "-1");

      focus(button("Copy"));
      press("ArrowRight");
      expect(button("Paste")).toHaveFocus();
      expect(tabIndexes("Copy", "Paste")).toEqual(["-1", "0"]);
    });

    it("falls back to the first item when the toolbar re-renders without the last-focused one", () => {
      function Host({ showItalic }: { showItalic: boolean }) {
        return (
          <Toolbar>
            <Button>Bold</Button>
            {showItalic ? <Button>Italic</Button> : null}
          </Toolbar>
        );
      }
      const { rerender } = render(<Host showItalic />);
      focus(button("Italic"));
      act(() => button("Italic").blur());

      rerender(<Host showItalic={false} />);
      expect(button("Bold")).toHaveAttribute("tabindex", "0");
    });

    it("falls back to the first item when a child unmounts the last-focused one on its own", async () => {
      let hide: () => void = () => {};
      function Removable() {
        const [shown, setShown] = useState(true);
        hide = () => setShown(false);
        return shown ? <Button>Italic</Button> : null;
      }
      render(
        <Toolbar>
          <Button>Bold</Button>
          <Removable />
        </Toolbar>,
      );
      focus(button("Italic"));
      act(() => button("Italic").blur());
      expect(button("Bold")).toHaveAttribute("tabindex", "-1");

      act(() => hide());
      await waitFor(() => expect(button("Bold")).toHaveAttribute("tabindex", "0"));
    });

    it("falls back to the first item while the last-focused one is natively disabled, and returns when it is enabled", async () => {
      let setDisabled: (disabled: boolean) => void = () => {};
      function Toggleable() {
        const [disabled, set] = useState(false);
        setDisabled = set;
        return <Button disabled={disabled}>Italic</Button>;
      }
      render(
        <Toolbar>
          <Button>Bold</Button>
          <Toggleable />
        </Toolbar>,
      );
      focus(button("Italic"));
      act(() => button("Italic").blur());

      act(() => setDisabled(true));
      await waitFor(() => expect(button("Bold")).toHaveAttribute("tabindex", "0"));

      act(() => setDisabled(false));
      await waitFor(() => expect(tabIndexes("Bold", "Italic")).toEqual(["-1", "0"]));
    });

    it("gives an item a child adds on its own a non-stop tabindex", async () => {
      let show: () => void = () => {};
      function Late() {
        const [shown, setShown] = useState(false);
        show = () => setShown(true);
        return shown ? <Button>Strike</Button> : null;
      }
      render(
        <Toolbar>
          <Button>Bold</Button>
          <Late />
        </Toolbar>,
      );
      act(() => show());
      await waitFor(() => expect(button("Strike")).toHaveAttribute("tabindex", "-1"));
      expect(button("Bold")).toHaveAttribute("tabindex", "0");
    });

    it("leaves the tab stop alone when focus lands on a non-item inside the toolbar", () => {
      render(
        <Toolbar>
          <Button>Bold</Button>
          <Button>Italic</Button>
          <span tabIndex={-1} data-testid="status">
            Saved
          </span>
        </Toolbar>,
      );
      focus(button("Italic"));
      focus(screen.getByTestId("status"));
      expect(tabIndexes("Bold", "Italic")).toEqual(["-1", "0"]);
    });

    it("leaves the tab stop alone when focus lands in a portal rendered from inside the toolbar", () => {
      render(
        <Toolbar>
          <Button>Bold</Button>
          <Button>Italic</Button>
          {createPortal(<button type="button">Portalled</button>, document.body)}
        </Toolbar>,
      );
      focus(button("Italic"));
      focus(button("Portalled"));
      expect(tabIndexes("Bold", "Italic")).toEqual(["-1", "0"]);
      expect(button("Portalled")).not.toHaveAttribute("tabindex");
    });
  });

  describe("keyboard", () => {
    it("moves between items with the vertical arrows when vertical", () => {
      render(
        <Toolbar orientation="vertical">
          <Button>Bold</Button>
          <Button>Italic</Button>
        </Toolbar>,
      );
      focus(button("Bold"));

      expect(press("ArrowRight")).toBe(false);
      expect(button("Bold")).toHaveFocus();
      expect(press("ArrowDown")).toBe(true);
      expect(button("Italic")).toHaveFocus();
    });

    it("lets a text input keep its inline arrows, and reaches it with them from a button", () => {
      render(
        <Toolbar>
          <Button>Bold</Button>
          <input aria-label="Font size" defaultValue="12" />
          <Button>Italic</Button>
        </Toolbar>,
      );
      const input = screen.getByRole("textbox", { name: "Font size" });
      focus(button("Bold"));

      press("ArrowRight");
      expect(input).toHaveFocus();
      expect(press("ArrowRight")).toBe(false);
      expect(press("ArrowLeft")).toBe(false);
      expect(input).toHaveFocus();
    });

    it("lets a slider keep its inline arrows", () => {
      render(
        <Toolbar>
          <Button>Bold</Button>
          <input type="range" aria-label="Zoom" />
        </Toolbar>,
      );
      const slider = screen.getByRole("slider", { name: "Zoom" });
      focus(slider);

      expect(press("ArrowLeft")).toBe(false);
      expect(slider).toHaveFocus();
    });

    it("runs the caller's onKeyDown first, and a preventDefault in it stops the move", () => {
      const onKeyDown = vi.fn((event: { preventDefault: () => void }) => event.preventDefault());
      render(
        <Toolbar onKeyDown={onKeyDown}>
          <Button>Bold</Button>
          <Button>Italic</Button>
        </Toolbar>,
      );
      focus(button("Bold"));

      press("ArrowRight");
      expect(onKeyDown).toHaveBeenCalledOnce();
      expect(button("Bold")).toHaveFocus();
    });

    it("runs the caller's onFocus", () => {
      const onFocus = vi.fn();
      render(
        <Toolbar onFocus={onFocus}>
          <Button>Bold</Button>
        </Toolbar>,
      );
      focus(button("Bold"));
      expect(onFocus).toHaveBeenCalledOnce();
    });
  });

  describe("stylesheet", () => {
    it("injects its stylesheet once for any number of toolbars", () => {
      render(
        <>
          <Toolbar />
          <Toolbar orientation="vertical" />
        </>,
      );
      // React hoists the style into `<head>` and rewrites `href`/`precedence` to
      // `data-href`/`data-precedence`, keyed on `href` for de-duplication.
      const styles = document.head.querySelectorAll('style[data-href="vpg-toolbar"]');
      expect(styles).toHaveLength(1);
      expect(styles[0]?.textContent).toBe(toolbarStylesheet);
      expect(toolbarStylesheet).toContain(".vpg-toolbar {");
    });

    it("never assigns a --vpg-* custom property inline", () => {
      render(<Toolbar orientation="vertical" className="custom" />);
      // An inline custom property would beat the base stylesheet's dark-mode reassignment on the
      // same element, so this instance would stop adapting to colour mode entirely.
      expect(screen.getByRole("toolbar").getAttribute("style")).toBeNull();
    });
  });
});
