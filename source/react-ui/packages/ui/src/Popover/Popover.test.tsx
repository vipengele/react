import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { Tooltip } from "../Tooltip/Tooltip.js";
import { Popover } from "./Popover.js";

/** Renders a popover inside a `.vpg-root`, the subtree `ThemeProvider` establishes. */
function renderThemed(ui: ReactNode) {
  return render(<div className="vpg-root">{ui}</div>);
}

/** The wrapper `<span>`, which is what carries the click handler. It is looked up by class rather
 * than by role: `FloatingFocusManager`'s modal mode hides everything outside the open panel from
 * the accessibility tree, so a role query for the trigger finds nothing while the panel is open. */
function trigger(container: HTMLElement): HTMLElement {
  const wrapper = container.querySelector<HTMLElement>(".vpg-popover-trigger");
  if (wrapper === null) {
    throw new Error("the trigger is not wrapped");
  }
  return wrapper;
}

/** The actual focusable control inside the wrapper — a plain `querySelector` rather than a role
 * query, since `FloatingFocusManager`'s modal mode hides it from the accessibility tree (and so
 * from role queries) while the panel is open. */
function triggerButton(container: HTMLElement): HTMLElement {
  const button = container.querySelector<HTMLElement>(".vpg-popover-trigger button");
  if (button === null) {
    throw new Error("the trigger's button was not found");
  }
  return button;
}

const content = (
  <>
    <p>Delete this draft?</p>
    <button type="button">Confirm</button>
  </>
);

describe("Popover", () => {
  it("stays closed until the trigger is clicked", () => {
    renderThemed(<Popover content={content}>{<button type="button">Options</button>}</Popover>);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens the panel on a trigger click and closes it on the next one", async () => {
    const { container } = renderThemed(
      <Popover content={content}>
        <button type="button">Options</button>
      </Popover>,
    );

    fireEvent.click(trigger(container));
    expect(screen.getByRole("dialog")).toHaveTextContent("Delete this draft?");

    fireEvent.click(trigger(container));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("dismisses the panel on an outside press", async () => {
    const { container } = renderThemed(
      <Popover content={content}>
        <button type="button">Options</button>
      </Popover>,
    );

    fireEvent.click(trigger(container));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    fireEvent.pointerDown(document.body);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("dismisses the panel on Escape", async () => {
    const { container } = renderThemed(
      <Popover content={content}>
        <button type="button">Options</button>
      </Popover>,
    );

    fireEvent.click(trigger(container));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("toggles aria-expanded on the trigger's actual control, not the inert wrapper, and marks it as opening a dialog", async () => {
    const { container } = renderThemed(
      <Popover content={content}>
        <button type="button">Options</button>
      </Popover>,
    );
    const wrapper = trigger(container);
    const button = triggerButton(container);
    expect(button).toHaveAttribute("aria-haspopup", "dialog");
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(wrapper).not.toHaveAttribute("aria-haspopup");
    expect(wrapper).not.toHaveAttribute("aria-expanded");

    fireEvent.click(wrapper);
    expect(button).toHaveAttribute("aria-expanded", "true");
    expect(button.getAttribute("aria-controls")).toBe(screen.getByRole("dialog").id);
    expect(wrapper).not.toHaveAttribute("aria-controls");

    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(button).toHaveAttribute("aria-expanded", "false"));
    expect(button).not.toHaveAttribute("aria-controls");
  });

  it("falls back to the wrapper's own aria attributes when children isn't a single element", async () => {
    const { container } = renderThemed(
      <Popover content={content}>
        <>Options</>
      </Popover>,
    );
    const wrapper = trigger(container);
    expect(wrapper).toHaveAttribute("aria-haspopup", "dialog");
    expect(wrapper).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(wrapper);
    expect(wrapper).toHaveAttribute("aria-expanded", "true");
    expect(wrapper.getAttribute("aria-controls")).toBe(screen.getByRole("dialog").id);
  });

  describe("focus", () => {
    it("moves focus into the panel when it opens", async () => {
      const { container } = renderThemed(
        <Popover content={content}>
          <button type="button">Options</button>
        </Popover>,
      );

      fireEvent.click(trigger(container));
      await waitFor(() => expect(screen.getByRole("dialog")).toContainElement(document.activeElement as HTMLElement | null));
    });

    it("returns focus to the trigger when the panel closes", async () => {
      const { container } = renderThemed(
        <Popover content={content}>
          <button type="button">Options</button>
        </Popover>,
      );

      fireEvent.click(trigger(container));
      await waitFor(() => expect(screen.getByRole("dialog")).toContainElement(document.activeElement as HTMLElement | null));

      fireEvent.keyDown(document, { key: "Escape" });
      await waitFor(() => expect(trigger(container)).toContainElement(document.activeElement as HTMLElement | null));
    });
  });

  describe("non-modal", () => {
    /** The open panel, looked up by class: a non-modal panel carries no role. */
    function panel(): HTMLElement | null {
      return document.querySelector<HTMLElement>(".vpg-popover");
    }

    it("opens a panel with no dialog role and leaves the page exposed to assistive tech", () => {
      const { container } = renderThemed(
        <Popover content={content} modal={false}>
          <button type="button">Options</button>
        </Popover>,
      );

      fireEvent.click(trigger(container));
      expect(panel()).toHaveTextContent("Delete this draft?");
      expect(panel()).not.toHaveAttribute("role");
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      // A role query reaches the trigger while the panel is open only because nothing outside the
      // panel is hidden.
      expect(screen.getByRole("button", { name: "Options" })).toBeInTheDocument();
    });

    it("puts no dialog semantics on the trigger's control or its wrapper", () => {
      const { container } = renderThemed(
        <Popover content={content} modal={false}>
          <button type="button" aria-describedby="hint">
            Options
          </button>
        </Popover>,
      );
      const wrapper = trigger(container);
      const button = triggerButton(container);

      fireEvent.click(wrapper);
      expect(panel()).toBeInTheDocument();
      for (const element of [button, wrapper]) {
        expect(element).not.toHaveAttribute("aria-haspopup");
        expect(element).not.toHaveAttribute("aria-expanded");
        expect(element).not.toHaveAttribute("aria-controls");
      }
      expect(button).toHaveAttribute("aria-describedby", "hint");
    });

    it("leaves the caller's own aria attributes on a single-element trigger", () => {
      const { container } = renderThemed(
        <Popover content={content} modal={false}>
          <button type="button" aria-expanded="false" aria-controls="elsewhere">
            Options
          </button>
        </Popover>,
      );

      const button = triggerButton(container);
      expect(button).toHaveAttribute("aria-expanded", "false");
      expect(button).toHaveAttribute("aria-controls", "elsewhere");
    });

    it("moves focus into the panel on open and returns it to the trigger on Escape", async () => {
      const { container } = renderThemed(
        <Popover content={content} modal={false}>
          <button type="button">Options</button>
        </Popover>,
      );

      fireEvent.click(trigger(container));
      await waitFor(() => expect(panel()).toContainElement(document.activeElement as HTMLElement | null));

      fireEvent.keyDown(document, { key: "Escape" });
      await waitFor(() => expect(panel()).toBeNull());
      await waitFor(() => expect(trigger(container)).toContainElement(document.activeElement as HTMLElement | null));
    });

    it("dismisses the panel on an outside press", async () => {
      const { container } = renderThemed(
        <Popover content={content} modal={false}>
          <button type="button">Options</button>
        </Popover>,
      );

      fireEvent.click(trigger(container));
      expect(panel()).toBeInTheDocument();

      fireEvent.pointerDown(document.body);
      await waitFor(() => expect(panel()).toBeNull());
    });
  });

  describe("uncontrolled", () => {
    it("starts open when defaultOpen is set", () => {
      renderThemed(
        <Popover content={content} defaultOpen>
          <button type="button">Options</button>
        </Popover>,
      );
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("reports every open change through onOpenChange while owning the state itself", async () => {
      const onOpenChange = vi.fn();
      const { container } = renderThemed(
        <Popover content={content} onOpenChange={onOpenChange}>
          <button type="button">Options</button>
        </Popover>,
      );

      fireEvent.click(trigger(container));
      expect(onOpenChange).toHaveBeenLastCalledWith(true);
      expect(screen.getByRole("dialog")).toBeInTheDocument();

      fireEvent.keyDown(document, { key: "Escape" });
      await waitFor(() => expect(onOpenChange).toHaveBeenLastCalledWith(false));
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  describe("controlled", () => {
    it("opens and closes only when the open prop changes", () => {
      const { container, rerender } = render(
        <div className="vpg-root">
          <Popover content={content} open={false}>
            <button type="button">Options</button>
          </Popover>
        </div>,
      );

      // The trigger still requests a change; without the prop following, nothing opens.
      fireEvent.click(trigger(container));
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

      rerender(
        <div className="vpg-root">
          <Popover content={content} open>
            <button type="button">Options</button>
          </Popover>
        </div>,
      );
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("reports a dismissal request rather than closing itself", async () => {
      const onOpenChange = vi.fn();
      const { container } = renderThemed(
        <Popover content={content} open onOpenChange={onOpenChange}>
          <button type="button">Options</button>
        </Popover>,
      );

      fireEvent.keyDown(document, { key: "Escape" });
      await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
      expect(screen.getByRole("dialog")).toBeInTheDocument();

      // A trigger click is a request too: the internal state is never written in the controlled
      // form, so no amount of toggling moves the panel while `open` stays put.
      fireEvent.click(trigger(container));
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
  });

  describe("portal target", () => {
    it("portals the panel into the nearest .vpg-root rather than the trigger's parent", () => {
      const { container } = renderThemed(
        <div className="trigger-parent">
          <Popover content={content} defaultOpen>
            <button type="button">Options</button>
          </Popover>
        </div>,
      );

      const panel = screen.getByRole("dialog");
      expect(panel.parentElement).toBe(container.querySelector(".vpg-root"));
      expect(container.querySelector(".trigger-parent")).not.toContainElement(panel);
    });

    it("picks the innermost .vpg-root when themed roots are nested", () => {
      const { container } = renderThemed(
        <div className="vpg-root inner">
          <Popover content={content} defaultOpen>
            <button type="button">Options</button>
          </Popover>
        </div>,
      );

      expect(screen.getByRole("dialog").parentElement).toBe(container.querySelector(".inner"));
    });

    it("renders the panel inline beside the trigger when there is no .vpg-root ancestor", () => {
      const { container } = render(
        <Popover content={content} defaultOpen>
          <button type="button">Options</button>
        </Popover>,
      );

      const panel = screen.getByRole("dialog");
      expect(container).toContainElement(panel);
      expect(container.querySelector(".vpg-popover-trigger")).not.toContainElement(panel);
    });

    it("portals the panel into a nearer overlay root rather than the .vpg-root around it", () => {
      const { container } = renderThemed(
        <div data-vpg-overlay-root="" className="overlay-root">
          <Popover content={content} defaultOpen>
            <button type="button">Options</button>
          </Popover>
        </div>,
      );

      expect(screen.getByRole("dialog").parentElement).toBe(container.querySelector(".overlay-root"));
    });

    it("portals the panel into a farther overlay root even past a nearer .vpg-root", () => {
      const { container } = render(
        <div data-vpg-overlay-root="" className="overlay-root">
          <div className="vpg-root">
            <Popover content={content} defaultOpen>
              <button type="button">Options</button>
            </Popover>
          </div>
        </div>,
      );

      expect(screen.getByRole("dialog").parentElement).toBe(container.querySelector(".overlay-root"));
    });
  });

  describe("nested overlays", () => {
    /** The open tooltip bubble, looked up by class: `FloatingFocusManager`'s modal mode can hide
     * elements outside the panel from role queries. */
    function tooltipBubble(): Element | null {
      return document.querySelector(".vpg-tooltip");
    }

    it("closes on Escape while a tooltip inside the panel is open", async () => {
      renderThemed(
        <Popover
          content={
            <Tooltip content="Removes the draft">
              <button type="button">Confirm</button>
            </Tooltip>
          }
          defaultOpen
        >
          <button type="button">Options</button>
        </Popover>,
      );

      const tooltipTrigger = document.querySelector(".vpg-popover .vpg-tooltip-trigger");
      fireEvent.mouseEnter(tooltipTrigger as HTMLElement);
      expect(tooltipBubble()).toBeInTheDocument();

      fireEvent.keyDown(document, { key: "Escape" });
      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
      expect(tooltipBubble()).toBeNull();
    });

    it("closes only the innermost of two nested popovers on Escape", async () => {
      renderThemed(
        <Popover
          content={
            <Popover content={<p>Inner panel</p>} className="inner" defaultOpen>
              <button type="button">More</button>
            </Popover>
          }
          className="outer"
          defaultOpen
        >
          <button type="button">Options</button>
        </Popover>,
      );
      expect(document.querySelector(".vpg-popover.inner")).toBeInTheDocument();

      fireEvent.keyDown(document, { key: "Escape" });
      await waitFor(() => expect(document.querySelector(".vpg-popover.inner")).toBeNull());
      expect(document.querySelector(".vpg-popover.outer")).toBeInTheDocument();
    });
  });

  it.each(["top", "bottom", "left", "right"] as const)("opens with the %s placement", (placement) => {
    renderThemed(
      <Popover content={content} placement={placement} defaultOpen>
        <button type="button">Options</button>
      </Popover>,
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("composes a caller-supplied className onto the panel", () => {
    renderThemed(
      <Popover content={content} className="custom" defaultOpen>
        <button type="button">Options</button>
      </Popover>,
    );

    expect(screen.getByRole("dialog")).toHaveClass("vpg-popover", "custom");
  });

  describe("stylesheet", () => {
    it("injects its stylesheet once for any number of popovers", () => {
      renderThemed(
        <>
          <Popover content={content}>
            <button type="button">Options</button>
          </Popover>
          <Popover content={content}>
            <button type="button">More</button>
          </Popover>
        </>,
      );

      // React hoists the style into `<head>` and rewrites `href`/`precedence` to
      // `data-href`/`data-precedence`, keyed on `href` for de-duplication.
      const styles = document.head.querySelectorAll('style[data-href="vpg-popover"]');
      expect(styles).toHaveLength(1);
      expect(styles[0]?.textContent).toContain(".vpg-popover {");
    });

    it("never assigns a --vpg-* custom property inline", () => {
      const { container } = renderThemed(
        <Popover content={content} className="custom" defaultOpen>
          <button type="button">Options</button>
        </Popover>,
      );

      // An inline custom property would beat the base stylesheet's dark-mode reassignment on the
      // same element, so this instance would stop adapting to colour mode. Floating-ui's computed
      // coordinates are plain CSS properties and are expected here.
      expect(screen.getByRole("dialog").getAttribute("style")).not.toContain("--vpg-");
      expect(container.querySelector(".vpg-popover-trigger")?.getAttribute("style")).toBeNull();
    });
  });
});
