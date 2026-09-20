import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { Tooltip } from "./Tooltip.js";

/** Renders a tooltip inside a `.vpg-root`, the subtree `ThemeProvider` establishes. */
function renderThemed(ui: ReactNode) {
  return render(<div className="vpg-root">{ui}</div>);
}

/** The wrapper `<span>`, which is what carries the hover/focus handlers — `mouseenter` does not
 * bubble, so firing it on the wrapped `<button>` would never reach them. */
function trigger(): HTMLElement {
  const wrapper = screen.getByRole("button", { name: "Save" }).closest("span");
  if (wrapper === null) {
    throw new Error("the trigger is not wrapped");
  }
  return wrapper;
}

describe("Tooltip", () => {
  it("stays closed until the trigger is hovered or focused", () => {
    renderThemed(
      <Tooltip content="Saves the draft">
        <button type="button">Save</button>
      </Tooltip>,
    );
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("shows the bubble on hover and hides it again when the pointer leaves", async () => {
    renderThemed(
      <Tooltip content="Saves the draft">
        <button type="button">Save</button>
      </Tooltip>,
    );

    fireEvent.mouseEnter(trigger());
    expect(screen.getByRole("tooltip")).toHaveTextContent("Saves the draft");

    fireEvent.mouseLeave(trigger());
    await waitFor(() => expect(screen.queryByRole("tooltip")).not.toBeInTheDocument());
  });

  it("shows the bubble on focus and hides it again on blur", async () => {
    renderThemed(
      <Tooltip content="Saves the draft">
        <button type="button">Save</button>
      </Tooltip>,
    );

    fireEvent.focus(trigger());
    expect(screen.getByRole("tooltip")).toBeInTheDocument();

    fireEvent.blur(trigger());
    await waitFor(() => expect(screen.queryByRole("tooltip")).not.toBeInTheDocument());
  });

  it("dismisses the bubble on Escape", async () => {
    renderThemed(
      <Tooltip content="Saves the draft">
        <button type="button">Save</button>
      </Tooltip>,
    );

    fireEvent.mouseEnter(trigger());
    expect(screen.getByRole("tooltip")).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("tooltip")).not.toBeInTheDocument());
  });

  it("describes the actual focusable child with the open bubble, not the wrapper, and stops describing it once closed", async () => {
    const { container } = renderThemed(
      <Tooltip content="Saves the draft">
        <button type="button">Save</button>
      </Tooltip>,
    );
    const wrapper = container.querySelector(".vpg-tooltip-trigger");
    const button = screen.getByRole("button", { name: "Save" });
    expect(button).not.toHaveAttribute("aria-describedby");
    expect(wrapper).not.toHaveAttribute("aria-describedby");

    fireEvent.mouseEnter(trigger());
    // A screen reader announces the description of whatever element has focus — the wrapper
    // `<span>` is never focusable, so the id has to land on the button itself.
    expect(button).toHaveAttribute("aria-describedby", screen.getByRole("tooltip").id);
    expect(wrapper).not.toHaveAttribute("aria-describedby");

    fireEvent.mouseLeave(trigger());
    await waitFor(() => expect(button).not.toHaveAttribute("aria-describedby"));
  });

  it("falls back to describing the wrapper when children isn't a single element", async () => {
    const { container } = renderThemed(
      <Tooltip content="Saves the draft">
        <>Save</>
      </Tooltip>,
    );
    const wrapper = container.querySelector(".vpg-tooltip-trigger");
    expect(wrapper).not.toHaveAttribute("aria-describedby");

    fireEvent.mouseEnter(wrapper as HTMLElement);
    expect(wrapper).toHaveAttribute("aria-describedby", screen.getByRole("tooltip").id);
  });

  describe("portal target", () => {
    it("portals the bubble into the nearest .vpg-root rather than the trigger's parent", () => {
      const { container } = renderThemed(
        <div className="trigger-parent">
          <Tooltip content="Saves the draft">
            <button type="button">Save</button>
          </Tooltip>
        </div>,
      );

      fireEvent.mouseEnter(trigger());
      const bubble = screen.getByRole("tooltip");
      expect(bubble.parentElement).toBe(container.querySelector(".vpg-root"));
      expect(container.querySelector(".trigger-parent")).not.toContainElement(bubble);
    });

    it("picks the innermost .vpg-root when themed roots are nested", () => {
      const { container } = renderThemed(
        <div className="vpg-root inner">
          <Tooltip content="Saves the draft">
            <button type="button">Save</button>
          </Tooltip>
        </div>,
      );

      fireEvent.mouseEnter(trigger());
      expect(screen.getByRole("tooltip").parentElement).toBe(container.querySelector(".inner"));
    });

    it("renders the bubble inline beside the trigger when there is no .vpg-root ancestor", () => {
      const { container } = render(
        <Tooltip content="Saves the draft">
          <button type="button">Save</button>
        </Tooltip>,
      );

      fireEvent.mouseEnter(trigger());
      const bubble = screen.getByRole("tooltip");
      expect(bubble).toBeInTheDocument();
      expect(bubble.previousElementSibling).toBe(container.querySelector(".vpg-tooltip-trigger"));
    });
  });

  describe("disabled", () => {
    it("never opens on hover", () => {
      renderThemed(
        <Tooltip content="Saves the draft" disabled>
          <button type="button">Save</button>
        </Tooltip>,
      );

      fireEvent.mouseEnter(trigger());
      expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    });

    it("never opens on focus", () => {
      renderThemed(
        <Tooltip content="Saves the draft" disabled>
          <button type="button">Save</button>
        </Tooltip>,
      );

      fireEvent.focus(trigger());
      expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    });

    it("closes an open bubble when the trigger becomes disabled", () => {
      const { rerender } = render(
        <div className="vpg-root">
          <Tooltip content="Saves the draft">
            <button type="button">Save</button>
          </Tooltip>
        </div>,
      );

      fireEvent.mouseEnter(trigger());
      expect(screen.getByRole("tooltip")).toBeInTheDocument();

      rerender(
        <div className="vpg-root">
          <Tooltip content="Saves the draft" disabled>
            <button type="button">Save</button>
          </Tooltip>
        </div>,
      );
      expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    });
  });

  it.each(["top", "bottom", "left", "right"] as const)("opens with the %s placement", (placement) => {
    renderThemed(
      <Tooltip content="Saves the draft" placement={placement}>
        <button type="button">Save</button>
      </Tooltip>,
    );

    fireEvent.mouseEnter(trigger());
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
  });

  it("composes a caller-supplied className onto the bubble", () => {
    renderThemed(
      <Tooltip content="Saves the draft" className="custom">
        <button type="button">Save</button>
      </Tooltip>,
    );

    fireEvent.mouseEnter(trigger());
    expect(screen.getByRole("tooltip")).toHaveClass("vpg-tooltip", "custom");
  });

  describe("stylesheet", () => {
    it("injects its stylesheet once for any number of tooltips", () => {
      renderThemed(
        <>
          <Tooltip content="Saves the draft">
            <button type="button">Save</button>
          </Tooltip>
          <Tooltip content="Throws the draft away">
            <button type="button">Discard</button>
          </Tooltip>
        </>,
      );

      // React hoists the style into `<head>` and rewrites `href`/`precedence` to
      // `data-href`/`data-precedence`, keyed on `href` for de-duplication.
      const styles = document.head.querySelectorAll('style[data-href="vpg-tooltip"]');
      expect(styles).toHaveLength(1);
      expect(styles[0]?.textContent).toContain(".vpg-tooltip {");
    });

    it("never assigns a --vpg-* custom property inline", () => {
      const { container } = renderThemed(
        <Tooltip content="Saves the draft" className="custom">
          <button type="button">Save</button>
        </Tooltip>,
      );

      fireEvent.mouseEnter(trigger());
      // An inline custom property would beat the base stylesheet's dark-mode reassignment on the
      // same element, so this instance would stop adapting to colour mode. Floating-ui's computed
      // coordinates are plain CSS properties and are expected here.
      expect(screen.getByRole("tooltip").getAttribute("style")).not.toContain("--vpg-");
      expect(container.querySelector(".vpg-tooltip-trigger")?.getAttribute("style")).toBeNull();
    });
  });
});
