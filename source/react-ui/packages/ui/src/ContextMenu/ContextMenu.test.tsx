import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Menu } from "../Menu/Menu.js";
import { ContextMenu } from "./ContextMenu.js";

/** Renders inside a `.vpg-root`, the subtree `ThemeProvider` establishes. */
function renderThemed(ui: ReactNode) {
  return render(<div className="vpg-root">{ui}</div>);
}

const region = (
  <div className="region">
    <button type="button">Focusable</button>
    <span className="text">Plain text</span>
  </div>
);

const rows = (
  <>
    <ContextMenu.Item>Copy</ContextMenu.Item>
    <ContextMenu.Item>Paste</ContextMenu.Item>
  </>
);

/** The wrapper around the target, which carries the gesture handlers. */
function wrapper(container: HTMLElement): HTMLElement {
  const element = container.querySelector(".region")?.parentElement;
  if (element == null) {
    throw new Error("the target is not wrapped");
  }
  return element;
}

function button(): HTMLElement {
  return screen.getByRole("button", { name: "Focusable" });
}

function text(container: HTMLElement): HTMLElement {
  return container.querySelector<HTMLElement>(".text") as HTMLElement;
}

function menu(): HTMLElement | null {
  return screen.queryByRole("menu");
}

/** Fires a secondary click at a viewport point and reports whether the browser's own menu was
 * left to show — `fireEvent` returns `false` once a handler calls `preventDefault`. */
function rightClick(element: Element, clientX: number, clientY: number): boolean {
  return fireEvent.contextMenu(element, { clientX, clientY });
}

/** The `contextmenu` a browser raises for `Shift+F10` or the `ContextMenu` key: no pointer
 * position. */
function keyboardContextMenu(element: Element): boolean {
  return fireEvent.contextMenu(element, { clientX: 0, clientY: 0 });
}

function touchDown(element: Element, clientX = 50, clientY = 60) {
  fireEvent.pointerDown(element, { pointerType: "touch", clientX, clientY });
}

/** Waits for the panel to be positioned at the given viewport point. */
async function expectPanelAt(x: number, y: number) {
  await waitFor(() => expect(menu()?.style.transform).toBe(`translate(${x}px, ${y}px)`));
}

/** Gives `element` a box at the given viewport position, which jsdom never lays out itself. */
function placeBox(element: Element, left: number, top: number, width: number, height: number) {
  vi.spyOn(element, "getBoundingClientRect").mockReturnValue({
    x: left,
    y: top,
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
    toJSON: () => ({}),
  });
}

/** Gives the document a viewport. jsdom reports a zero-size one, which makes floating-ui flip and
 * shift every panel against its edges and hides which anchor the panel was given. */
function giveViewport() {
  vi.spyOn(document.documentElement, "clientWidth", "get").mockReturnValue(1024);
  vi.spyOn(document.documentElement, "clientHeight", "get").mockReturnValue(768);
}

function useFakeTimers() {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
}

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("ContextMenu", () => {
  it("stays closed until the target is invoked", () => {
    renderThemed(<ContextMenu target={region}>{rows}</ContextMenu>);
    expect(menu()).not.toBeInTheDocument();
  });

  it("opens on a secondary click on the target, in place of the browser's own menu", () => {
    const { container } = renderThemed(<ContextMenu target={region}>{rows}</ContextMenu>);

    expect(rightClick(text(container), 100, 200)).toBe(false);
    expect(menu()).toHaveTextContent("Copy");
  });

  it("leaves a secondary click outside the target to the browser", () => {
    const { container } = renderThemed(
      <>
        <p className="outside">Elsewhere</p>
        <ContextMenu target={region}>{rows}</ContextMenu>
      </>,
    );

    expect(rightClick(container.querySelector(".outside") as Element, 10, 10)).toBe(true);
    expect(menu()).not.toBeInTheDocument();
  });

  it("wraps the target in a display: contents element and composes className onto the panel", () => {
    const { container } = renderThemed(
      <ContextMenu target={region} className="custom" defaultOpen>
        {rows}
      </ContextMenu>,
    );

    expect(wrapper(container)).toHaveStyle({ display: "contents" });
    expect(menu()).toHaveClass("vpg-menu", "custom");
    expect(wrapper(container)).not.toContainElement(menu());
  });

  it("dismisses on Escape and on an outside press", async () => {
    const { container } = renderThemed(<ContextMenu target={region}>{rows}</ContextMenu>);

    rightClick(text(container), 100, 200);
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(menu()).not.toBeInTheDocument());

    rightClick(text(container), 100, 200);
    fireEvent.pointerDown(document.body);
    await waitFor(() => expect(menu()).not.toBeInTheDocument());
  });

  it("keeps its own panel's contextmenu from the browser", () => {
    renderThemed(
      <ContextMenu target={region} defaultOpen>
        {rows}
      </ContextMenu>,
    );

    expect(rightClick(screen.getByRole("menuitem", { name: "Copy" }), 20, 20)).toBe(false);
  });

  describe("uncontrolled", () => {
    it("starts open when defaultOpen is set", () => {
      renderThemed(
        <ContextMenu target={region} defaultOpen>
          {rows}
        </ContextMenu>,
      );
      expect(menu()).toBeInTheDocument();
    });

    it("reports every open change through onOpenChange while owning the state itself", async () => {
      const onOpenChange = vi.fn();
      const { container } = renderThemed(
        <ContextMenu target={region} onOpenChange={onOpenChange}>
          {rows}
        </ContextMenu>,
      );

      rightClick(text(container), 100, 200);
      expect(onOpenChange).toHaveBeenLastCalledWith(true);
      expect(menu()).toBeInTheDocument();

      fireEvent.keyDown(document, { key: "Escape" });
      await waitFor(() => expect(onOpenChange).toHaveBeenLastCalledWith(false));
      expect(menu()).not.toBeInTheDocument();
    });
  });

  describe("controlled", () => {
    it("opens and closes only when the open prop changes", () => {
      const onOpenChange = vi.fn();
      const { container, rerender } = renderThemed(
        <ContextMenu target={region} open={false} onOpenChange={onOpenChange}>
          {rows}
        </ContextMenu>,
      );

      rightClick(text(container), 100, 200);
      expect(onOpenChange).toHaveBeenCalledWith(true);
      expect(menu()).not.toBeInTheDocument();

      rerender(
        <div className="vpg-root">
          <ContextMenu target={region} open onOpenChange={onOpenChange}>
            {rows}
          </ContextMenu>
        </div>,
      );
      expect(menu()).toBeInTheDocument();
    });

    it("reports a dismissal request rather than closing itself", async () => {
      const onOpenChange = vi.fn();
      renderThemed(
        <ContextMenu target={region} open onOpenChange={onOpenChange}>
          {rows}
        </ContextMenu>,
      );

      fireEvent.keyDown(document, { key: "Escape" });
      await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
      expect(menu()).toBeInTheDocument();
    });
  });

  describe("disabled", () => {
    it("leaves a secondary click to the browser and stays closed", () => {
      const onOpenChange = vi.fn();
      const { container } = renderThemed(
        <ContextMenu target={region} disabled onOpenChange={onOpenChange}>
          {rows}
        </ContextMenu>,
      );

      expect(rightClick(text(container), 100, 200)).toBe(true);
      expect(menu()).not.toBeInTheDocument();
      expect(onOpenChange).not.toHaveBeenCalled();
    });

    it("leaves Shift+F10 to the browser and stays closed", () => {
      renderThemed(
        <ContextMenu target={region} disabled>
          {rows}
        </ContextMenu>,
      );

      expect(fireEvent.keyDown(button(), { key: "F10", shiftKey: true })).toBe(true);
      expect(menu()).not.toBeInTheDocument();
    });

    it("starts no long press", () => {
      useFakeTimers();
      const { container } = renderThemed(
        <ContextMenu target={region} disabled>
          {rows}
        </ContextMenu>,
      );

      touchDown(text(container));
      advance(1000);
      expect(menu()).not.toBeInTheDocument();
    });
  });

  describe("nesting", () => {
    function renderNested(outerChange: (open: boolean) => void, innerChange: (open: boolean) => void) {
      return renderThemed(
        <ContextMenu
          onOpenChange={outerChange}
          target={
            <div className="outer">
              <span className="outer-only">Outer</span>
              <ContextMenu target={<span className="inner">Inner</span>} onOpenChange={innerChange}>
                <ContextMenu.Item>Inner row</ContextMenu.Item>
              </ContextMenu>
            </div>
          }
        >
          <ContextMenu.Item>Outer row</ContextMenu.Item>
        </ContextMenu>,
      );
    }

    it("opens only the innermost menu for a secondary click on the inner target", () => {
      const outer = vi.fn();
      const inner = vi.fn();
      const { container } = renderNested(outer, inner);

      rightClick(container.querySelector(".inner") as Element, 30, 30);
      expect(inner).toHaveBeenCalledWith(true);
      expect(outer).not.toHaveBeenCalled();
      expect(screen.getByRole("menuitem", { name: "Inner row" })).toBeInTheDocument();
    });

    it("opens the outer menu for a secondary click on the outer target alone", () => {
      const outer = vi.fn();
      const inner = vi.fn();
      const { container } = renderNested(outer, inner);

      rightClick(container.querySelector(".outer-only") as Element, 30, 30);
      expect(outer).toHaveBeenCalledWith(true);
      expect(inner).not.toHaveBeenCalled();
    });

    it("opens only the innermost menu for Shift+F10 and a long press on the inner target", () => {
      useFakeTimers();
      const outer = vi.fn();
      const inner = vi.fn();
      const { container } = renderNested(outer, inner);
      const innerTarget = container.querySelector(".inner") as HTMLElement;

      fireEvent.keyDown(innerTarget, { key: "F10", shiftKey: true });
      expect(inner.mock.calls).toEqual([[true]]);

      // The touch is an outside press for the open inner menu, which the long press then reopens.
      touchDown(innerTarget);
      advance(500);
      expect(inner.mock.calls).toEqual([[true], [false], [true]]);
      expect(outer).not.toHaveBeenCalled();
    });

    it("leaves a contextmenu another handler already prevented alone", () => {
      const onOpenChange = vi.fn();
      renderThemed(
        <ContextMenu
          onOpenChange={onOpenChange}
          target={
            // biome-ignore lint/a11y/noStaticElementInteractions: a consumer's own handler claiming the event first
            <div onContextMenu={(event) => event.preventDefault()}>
              <span className="claimed">Claimed</span>
            </div>
          }
        >
          {rows}
        </ContextMenu>,
      );

      rightClick(screen.getByText("Claimed"), 30, 30);
      expect(onOpenChange).not.toHaveBeenCalled();
    });

    it("ignores gestures inside an overlay portalled from inside the target", async () => {
      const onOpenChange = vi.fn();
      renderThemed(
        <ContextMenu
          onOpenChange={onOpenChange}
          target={
            <Menu trigger={<button type="button">Actions</button>} defaultOpen>
              <Menu.Item>Archive</Menu.Item>
            </Menu>
          }
        >
          {rows}
        </ContextMenu>,
      );
      const archive = screen.getByRole("menuitem", { name: "Archive" });

      expect(rightClick(archive, 30, 30)).toBe(true);
      fireEvent.keyDown(archive, { key: "F10", shiftKey: true });
      useFakeTimers();
      touchDown(archive);
      advance(500);
      expect(onOpenChange).not.toHaveBeenCalled();
    });
  });

  describe("keyboard", () => {
    it.each([
      ["Shift+F10", { key: "F10", shiftKey: true }],
      ["the ContextMenu key", { key: "ContextMenu" }],
    ])("opens on %s on the focused element, on its first row", async (_, init) => {
      renderThemed(<ContextMenu target={region}>{rows}</ContextMenu>);

      expect(fireEvent.keyDown(button(), init)).toBe(false);
      expect(menu()).toBeInTheDocument();
      await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("menuitem", { name: "Copy" })));
    });

    it("opens once when the browser follows the key with its own contextmenu", () => {
      const onOpenChange = vi.fn();
      renderThemed(
        <ContextMenu target={region} onOpenChange={onOpenChange}>
          {rows}
        </ContextMenu>,
      );

      fireEvent.keyDown(button(), { key: "ContextMenu" });
      expect(keyboardContextMenu(button())).toBe(false);
      expect(onOpenChange).toHaveBeenCalledTimes(1);
    });

    it("treats a later key press as a new gesture", async () => {
      const onOpenChange = vi.fn();
      renderThemed(
        <ContextMenu target={region} onOpenChange={onOpenChange}>
          {rows}
        </ContextMenu>,
      );

      fireEvent.keyDown(button(), { key: "F10", shiftKey: true });
      fireEvent.keyDown(document, { key: "Escape" });
      await waitFor(() => expect(menu()).not.toBeInTheDocument());

      fireEvent.keyDown(button(), { key: "a" });
      keyboardContextMenu(button());
      expect(menu()).toBeInTheDocument();
      expect(onOpenChange).toHaveBeenLastCalledWith(true);
    });

    it("ignores other keys, F10 without Shift included", () => {
      renderThemed(<ContextMenu target={region}>{rows}</ContextMenu>);

      expect(fireEvent.keyDown(button(), { key: "F10" })).toBe(true);
      expect(fireEvent.keyDown(button(), { key: "Enter" })).toBe(true);
      expect(menu()).not.toBeInTheDocument();
    });
  });

  describe("anchor", () => {
    beforeEach(giveViewport);

    it("opens at the pointer for a contextmenu carrying a position", async () => {
      const { container } = renderThemed(<ContextMenu target={region}>{rows}</ContextMenu>);

      rightClick(text(container), 100, 200);
      await expectPanelAt(100, 200);
    });

    it("reads a contextmenu at 0,0 as raised from the keyboard and opens below the focused element", async () => {
      renderThemed(<ContextMenu target={region}>{rows}</ContextMenu>);
      placeBox(button(), 40, 60, 80, 20);

      keyboardContextMenu(button());
      await expectPanelAt(40, 80);
    });

    it("opens below the focused element for Shift+F10", async () => {
      renderThemed(<ContextMenu target={region}>{rows}</ContextMenu>);
      placeBox(button(), 300, 100, 80, 30);

      fireEvent.keyDown(button(), { key: "F10", shiftKey: true });
      await expectPanelAt(300, 130);
    });

    it("anchors a menu opened by defaultOpen to the target's first element", async () => {
      vi.spyOn(HTMLDivElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLDivElement) {
        const top = this.classList.contains("region") ? 150 : 0;
        return { x: 70, y: top, left: 70, top, width: 100, height: 40, right: 170, bottom: top + 40, toJSON: () => ({}) };
      });
      renderThemed(
        <ContextMenu target={region} defaultOpen>
          {rows}
        </ContextMenu>,
      );

      await expectPanelAt(70, 190);
    });

    it("opens by defaultOpen when the target holds no element", () => {
      renderThemed(
        <ContextMenu target="Plain text target" defaultOpen>
          {rows}
        </ContextMenu>,
      );
      expect(menu()).toBeInTheDocument();
    });

    it("moves an open menu to the new point when the target is invoked again", async () => {
      const onOpenChange = vi.fn();
      const { container } = renderThemed(
        <ContextMenu target={region} onOpenChange={onOpenChange}>
          {rows}
        </ContextMenu>,
      );

      rightClick(text(container), 100, 200);
      await expectPanelAt(100, 200);

      rightClick(text(container), 300, 400);
      await expectPanelAt(300, 400);
      expect(menu()).toBeInTheDocument();
    });

    it("closes on a secondary press elsewhere on the target and reopens at the new point", async () => {
      const onOpenChange = vi.fn();
      const { container } = renderThemed(
        <ContextMenu target={region} onOpenChange={onOpenChange}>
          {rows}
        </ContextMenu>,
      );

      rightClick(text(container), 100, 200);
      await expectPanelAt(100, 200);

      // The press reaches the document's outside-press listener first, then the contextmenu the
      // same secondary click raises reaches the target.
      fireEvent.pointerDown(text(container), { button: 2, pointerType: "mouse" });
      rightClick(text(container), 300, 400);
      await expectPanelAt(300, 400);
      expect(onOpenChange.mock.calls).toEqual([[true], [false], [true]]);
    });
  });

  describe("long press", () => {
    it("opens at the touch point once the touch rests for the delay", async () => {
      giveViewport();
      useFakeTimers();
      const { container } = renderThemed(<ContextMenu target={region}>{rows}</ContextMenu>);

      touchDown(text(container), 50, 60);
      advance(499);
      expect(menu()).not.toBeInTheDocument();
      advance(1);
      expect(menu()).toBeInTheDocument();

      vi.useRealTimers();
      await expectPanelAt(50, 60);
    });

    it("honours longPressDelay", () => {
      useFakeTimers();
      const { container } = renderThemed(
        <ContextMenu target={region} longPressDelay={800}>
          {rows}
        </ContextMenu>,
      );

      touchDown(text(container));
      advance(799);
      expect(menu()).not.toBeInTheDocument();
      advance(1);
      expect(menu()).toBeInTheDocument();
    });

    it.each(["mouse", "pen"])("is not started by a %s press", (pointerType) => {
      useFakeTimers();
      const { container } = renderThemed(<ContextMenu target={region}>{rows}</ContextMenu>);

      fireEvent.pointerDown(text(container), { pointerType, clientX: 50, clientY: 60 });
      advance(1000);
      expect(menu()).not.toBeInTheDocument();
    });

    it.each([
      ["the touch lifts", (element: Element) => fireEvent.pointerUp(element, { pointerType: "touch" })],
      ["the browser cancels the touch", (element: Element) => fireEvent.pointerCancel(element, { pointerType: "touch" })],
      [
        "the touch drifts past the tolerance",
        (element: Element) => fireEvent.pointerMove(element, { pointerType: "touch", clientX: 58, clientY: 68 }),
      ],
      ["the document scrolls", () => fireEvent.scroll(document)],
      ["a scroller inside the page scrolls", (element: Element) => fireEvent.scroll(element)],
    ])("is cancelled when %s", (_, interrupt) => {
      useFakeTimers();
      const { container } = renderThemed(<ContextMenu target={region}>{rows}</ContextMenu>);

      touchDown(text(container), 50, 60);
      advance(300);
      interrupt(text(container));
      advance(1000);
      expect(menu()).not.toBeInTheDocument();
    });

    it("survives a drift within the tolerance", () => {
      useFakeTimers();
      const { container } = renderThemed(<ContextMenu target={region}>{rows}</ContextMenu>);

      touchDown(text(container), 50, 60);
      fireEvent.pointerMove(text(container), { pointerType: "touch", clientX: 56, clientY: 68 });
      advance(500);
      expect(menu()).toBeInTheDocument();
    });

    it("stops listening for scrolls once the press ends", () => {
      useFakeTimers();
      const removeListener = vi.spyOn(document, "removeEventListener");
      const { container } = renderThemed(<ContextMenu target={region}>{rows}</ContextMenu>);

      touchDown(text(container));
      fireEvent.pointerUp(text(container), { pointerType: "touch" });
      expect(removeListener).toHaveBeenCalledWith("scroll", expect.any(Function), { capture: true });
    });

    it("is cancelled when disabled turns on mid-press", () => {
      useFakeTimers();
      const { container, rerender } = renderThemed(<ContextMenu target={region}>{rows}</ContextMenu>);

      touchDown(text(container));
      advance(300);
      rerender(
        <div className="vpg-root">
          <ContextMenu target={region} disabled>
            {rows}
          </ContextMenu>
        </div>,
      );
      advance(1000);
      expect(menu()).not.toBeInTheDocument();
    });

    it("is cancelled when the target unmounts mid-press", () => {
      useFakeTimers();
      const onOpenChange = vi.fn();
      const { container, unmount } = renderThemed(
        <ContextMenu target={region} onOpenChange={onOpenChange}>
          {rows}
        </ContextMenu>,
      );

      touchDown(text(container));
      unmount();
      advance(1000);
      expect(onOpenChange).not.toHaveBeenCalled();
    });

    it("swallows the contextmenu and the click that follow a long press", () => {
      useFakeTimers();
      const onOpenChange = vi.fn();
      const onClick = vi.fn();
      renderThemed(
        <ContextMenu
          onOpenChange={onOpenChange}
          target={
            <button type="button" onClick={onClick}>
              Item
            </button>
          }
        >
          {rows}
        </ContextMenu>,
      );
      const item = screen.getByRole("button", { name: "Item" });

      touchDown(item, 50, 60);
      advance(500);
      expect(onOpenChange).toHaveBeenCalledTimes(1);

      expect(rightClick(item, 50, 60)).toBe(false);
      expect(fireEvent.click(item, { detail: 1 })).toBe(false);
      expect(onClick).not.toHaveBeenCalled();
      expect(onOpenChange).toHaveBeenCalledTimes(1);

      // The next tap is a gesture of its own.
      fireEvent.pointerDown(item, { pointerType: "touch" });
      fireEvent.pointerUp(item, { pointerType: "touch" });
      fireEvent.click(item, { detail: 1 });
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it("opens once when the browser's own contextmenu lands before the long-press timer", () => {
      useFakeTimers();
      const onOpenChange = vi.fn();
      const onClick = vi.fn();
      renderThemed(
        <ContextMenu
          onOpenChange={onOpenChange}
          target={
            <button type="button" onClick={onClick}>
              Item
            </button>
          }
        >
          {rows}
        </ContextMenu>,
      );
      const item = screen.getByRole("button", { name: "Item" });

      touchDown(item, 50, 60);
      advance(450);
      expect(rightClick(item, 50, 60)).toBe(false);
      advance(1000);
      expect(onOpenChange).toHaveBeenCalledTimes(1);

      fireEvent.click(item, { detail: 1 });
      expect(onClick).not.toHaveBeenCalled();
    });
  });

  describe("focus", () => {
    it("returns focus on close to the element that held it when the menu opened", async () => {
      renderThemed(<ContextMenu target={region}>{rows}</ContextMenu>);
      button().focus();

      rightClick(button(), 100, 200);
      await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("menuitem", { name: "Copy" })));

      fireEvent.keyDown(document, { key: "Escape" });
      await waitFor(() => expect(document.activeElement).toBe(button()));
    });

    it("moves focus nowhere on close when nothing held it before the menu opened", async () => {
      const { container } = renderThemed(<ContextMenu target={region}>{rows}</ContextMenu>);

      rightClick(text(container), 100, 200);
      await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("menuitem", { name: "Copy" })));

      fireEvent.keyDown(document, { key: "Escape" });
      await waitFor(() => expect(menu()).not.toBeInTheDocument());
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(document.activeElement).toBe(document.body);
    });
  });

  describe("portal target", () => {
    it("portals the panel into the nearest .vpg-root", () => {
      const { container } = renderThemed(
        <div className="target-parent">
          <ContextMenu target={region} defaultOpen>
            {rows}
          </ContextMenu>
        </div>,
      );

      expect(menu()?.parentElement).toBe(container.querySelector(".vpg-root"));
    });

    it("portals the panel into the target's overlay root, past the .vpg-root around it", () => {
      const { container } = renderThemed(
        <div data-vpg-overlay-root="" className="overlay-root">
          <ContextMenu target={region} defaultOpen>
            {rows}
          </ContextMenu>
        </div>,
      );

      expect(menu()?.parentElement).toBe(container.querySelector(".overlay-root"));
    });

    it("renders the panel inline beside the target when there is no .vpg-root ancestor", () => {
      const { container } = render(
        <ContextMenu target={region} defaultOpen>
          {rows}
        </ContextMenu>,
      );

      expect(container).toContainElement(menu());
      expect(wrapper(container)).not.toContainElement(menu());
    });
  });

  describe("rows", () => {
    it("aliases Menu's rows", () => {
      expect(ContextMenu.Item).toBe(Menu.Item);
      expect(ContextMenu.CheckboxItem).toBe(Menu.CheckboxItem);
      expect(ContextMenu.RadioItem).toBe(Menu.RadioItem);
      expect(ContextMenu.Separator).toBe(Menu.Separator);
      expect(ContextMenu.Group).toBe(Menu.Group);
    });

    it("renders every row kind and activates them as a Menu does", async () => {
      const onSelect = vi.fn();
      const onCheckedChange = vi.fn();
      const onValueChange = vi.fn();
      renderThemed(
        <ContextMenu target={region} defaultOpen>
          <ContextMenu.Item onSelect={onSelect}>Copy</ContextMenu.Item>
          <ContextMenu.CheckboxItem checked onCheckedChange={onCheckedChange}>
            Wrap lines
          </ContextMenu.CheckboxItem>
          <ContextMenu.Separator />
          <ContextMenu.Group label="Sort" value="name" onValueChange={onValueChange}>
            <ContextMenu.RadioItem value="name">Name</ContextMenu.RadioItem>
            <ContextMenu.RadioItem value="date">Date</ContextMenu.RadioItem>
          </ContextMenu.Group>
        </ContextMenu>,
      );

      expect(screen.getByRole("separator")).toBeInTheDocument();
      expect(screen.getByRole("group", { name: "Sort" })).toBeInTheDocument();
      expect(screen.getByRole("menuitemradio", { name: "Name" })).toHaveAttribute("aria-checked", "true");

      fireEvent.click(screen.getByRole("menuitemcheckbox", { name: "Wrap lines" }), { detail: 1 });
      expect(onCheckedChange).toHaveBeenCalledWith(false);
      expect(menu()).toBeInTheDocument();

      fireEvent.click(screen.getByRole("menuitemradio", { name: "Date" }), { detail: 1 });
      expect(onValueChange).toHaveBeenCalledWith("date");
      await waitFor(() => expect(menu()).not.toBeInTheDocument());
    });

    it("closes on activating an item", async () => {
      const onSelect = vi.fn();
      renderThemed(
        <ContextMenu target={region} defaultOpen>
          <ContextMenu.Item onSelect={onSelect}>Copy</ContextMenu.Item>
        </ContextMenu>,
      );

      fireEvent.click(screen.getByRole("menuitem", { name: "Copy" }), { detail: 1 });
      expect(onSelect).toHaveBeenCalledTimes(1);
      await waitFor(() => expect(menu()).not.toBeInTheDocument());
    });

    it("throws on a child that is not a row, naming the ContextMenu", () => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      expect(() =>
        render(
          <ContextMenu target={region}>
            <div>Not a row</div>
          </ContextMenu>,
        ),
      ).toThrow("<ContextMenu> accepts only");
    });
  });

  describe("stylesheet", () => {
    it("shares one injected stylesheet with Menu", () => {
      renderThemed(
        <>
          <Menu trigger={<button type="button">Actions</button>}>{rows}</Menu>
          <ContextMenu target={region}>{rows}</ContextMenu>
          <ContextMenu target={<span>Second</span>}>{rows}</ContextMenu>
        </>,
      );

      // React hoists the style into `<head>` and rewrites `href` to `data-href`, keyed on it for
      // de-duplication.
      expect(document.head.querySelectorAll('style[data-href="vpg-menu"]')).toHaveLength(1);
    });

    it("never assigns a --vpg-* custom property inline", () => {
      const { container } = renderThemed(
        <ContextMenu target={region} defaultOpen>
          {rows}
        </ContextMenu>,
      );

      for (const element of [wrapper(container), menu() as HTMLElement]) {
        expect(element.getAttribute("style") ?? "").not.toMatch(/--vpg-/);
      }
    });
  });
});
