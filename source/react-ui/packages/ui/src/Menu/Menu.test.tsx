import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { Popover } from "../Popover/Popover.js";
import { Menu } from "./Menu.js";

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
    <button type="button">Rename</button>
    <button type="button">Delete</button>
  </>
);

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
