import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Toggle } from "./Toggle.js";

describe("Toggle", () => {
  it("renders as a switch", () => {
    render(<Toggle aria-label="Enable notifications" />);
    expect(screen.getByRole("switch", { name: "Enable notifications" })).toBeInTheDocument();
  });

  it("becomes checked after a click", () => {
    render(<Toggle aria-label="Enable notifications" />);
    const toggle = screen.getByRole("switch", { name: "Enable notifications" });
    expect(toggle).not.toBeChecked();
    fireEvent.click(toggle);
    expect(toggle).toBeChecked();
  });

  it("starts checked when defaultChecked is set", () => {
    render(<Toggle aria-label="Enable notifications" defaultChecked />);
    expect(screen.getByRole("switch", { name: "Enable notifications" })).toBeChecked();
  });

  it("composes a caller-supplied className alongside its own classes", () => {
    render(<Toggle aria-label="Enable notifications" className="custom" />);
    const toggle = screen.getByRole("switch", { name: "Enable notifications" });
    expect(toggle).toHaveClass("custom");
    expect(toggle).toHaveClass("tandiko-toggle");
  });

  it("forwards arbitrary attributes to the input", () => {
    render(<Toggle aria-label="Enable notifications" data-testid="target" />);
    expect(screen.getByTestId("target")).toBeInTheDocument();
  });

  describe("stylesheet", () => {
    it("injects its stylesheet once for any number of toggles", () => {
      render(
        <>
          <Toggle aria-label="First" />
          <Toggle aria-label="Second" />
        </>,
      );

      // React hoists the style into `<head>` and rewrites `href`/`precedence` to
      // `data-href`/`data-precedence`, keyed on `href` for de-duplication.
      const styles = document.head.querySelectorAll('style[data-href="tandiko-toggle"]');
      expect(styles).toHaveLength(1);
      expect(styles[0]?.textContent).toContain(".tandiko-toggle {");
    });

    it("never assigns a --tandiko-* custom property inline", () => {
      render(<Toggle aria-label="Enable notifications" className="custom" />);
      // An inline custom property would beat the stylesheet's dark-mode reassignment on the
      // same element, so this instance would stop adapting to colour mode entirely.
      expect(
        screen.getByRole("switch", { name: "Enable notifications" }).getAttribute("style"),
      ).toBeNull();
    });
  });
});
