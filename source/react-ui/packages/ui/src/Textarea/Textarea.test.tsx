import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Textarea } from "./Textarea.js";

describe("Textarea", () => {
  it("renders a native textarea", () => {
    render(<Textarea aria-label="Notes" />);
    const field = screen.getByRole("textbox", { name: "Notes" });
    expect(field.tagName).toBe("TEXTAREA");
    expect(field).toHaveAttribute("rows", "3");
  });

  it("forwards arbitrary attributes and rows to the textarea", () => {
    render(<Textarea aria-label="Notes" data-testid="target" placeholder="Write here" rows={6} />);
    const field = screen.getByTestId("target");
    expect(field).toHaveAttribute("placeholder", "Write here");
    expect(field).toHaveAttribute("rows", "6");
  });

  it("orders its classes as component, shell-control marker, then the caller's", () => {
    render(<Textarea aria-label="Notes" className="custom" />);
    expect(screen.getByRole("textbox", { name: "Notes" }).className).toBe("vpg-textarea vpg-field-shell-control custom");
  });

  it("omits a caller className that is absent", () => {
    render(<Textarea aria-label="Notes" />);
    expect(screen.getByRole("textbox", { name: "Notes" }).className).toBe("vpg-textarea vpg-field-shell-control");
  });

  it("is a direct child of the field shell", () => {
    render(<Textarea aria-label="Notes" />);
    expect(screen.getByRole("textbox", { name: "Notes" }).parentElement).toHaveClass("vpg-field-shell");
  });

  it("renders a leading adornment before the textarea", () => {
    render(<Textarea aria-label="Notes" leading={<span>L</span>} />);
    const field = screen.getByRole("textbox", { name: "Notes" });
    const leading = field.parentElement?.querySelector(".vpg-field-shell-leading");
    expect(leading).toHaveTextContent("L");
    expect(leading?.nextElementSibling).toBe(field);
  });

  it("renders a trailing adornment after the textarea", () => {
    render(<Textarea aria-label="Notes" trailing={<span>T</span>} />);
    const field = screen.getByRole("textbox", { name: "Notes" });
    const trailing = field.parentElement?.querySelector(".vpg-field-shell-trailing");
    expect(trailing).toHaveTextContent("T");
    expect(field.nextElementSibling).toBe(trailing);
  });

  it("injects its stylesheet once for any number of instances", () => {
    render(
      <>
        <Textarea aria-label="One" />
        <Textarea aria-label="Two" />
        <Textarea aria-label="Three" />
      </>,
    );
    expect(document.head.querySelectorAll('style[data-href="vpg-textarea"]')).toHaveLength(1);
  });

  describe("fixed", () => {
    it("carries no inline style and no auto-grow marker", () => {
      render(<Textarea aria-label="Notes" />);
      const field = screen.getByRole("textbox", { name: "Notes" });
      expect(field).not.toHaveAttribute("style");
      expect(field).not.toHaveAttribute("data-auto-grow");
    });

    it("applies a consumer style as given", () => {
      render(<Textarea aria-label="Notes" style={{ color: "red" }} />);
      expect(screen.getByRole("textbox", { name: "Notes" }).getAttribute("style")).toContain("color: red");
    });
  });

  describe("autoGrow", () => {
    it("marks the control with an empty data-auto-grow attribute", () => {
      render(<Textarea aria-label="Notes" autoGrow />);
      expect(screen.getByRole("textbox", { name: "Notes" })).toHaveAttribute("data-auto-grow", "");
    });

    it("sets a min-height of the default three rows and no max-height", () => {
      render(<Textarea aria-label="Notes" autoGrow />);
      const style = screen.getByRole("textbox", { name: "Notes" }).getAttribute("style");
      expect(style).toContain("min-height: 3lh");
      expect(style).not.toContain("max-height");
    });

    it("sets min-height from rows", () => {
      render(<Textarea aria-label="Notes" autoGrow rows={5} />);
      expect(screen.getByRole("textbox", { name: "Notes" }).getAttribute("style")).toContain("min-height: 5lh");
    });

    it("sets max-height from maxRows", () => {
      render(<Textarea aria-label="Notes" autoGrow rows={2} maxRows={8} />);
      const style = screen.getByRole("textbox", { name: "Notes" }).getAttribute("style");
      expect(style).toContain("min-height: 2lh");
      expect(style).toContain("max-height: 8lh");
    });

    it("lets a consumer style win over the min and max heights", () => {
      render(<Textarea aria-label="Notes" autoGrow maxRows={8} style={{ minHeight: "10px", maxHeight: "20px" }} />);
      const style = screen.getByRole("textbox", { name: "Notes" }).getAttribute("style");
      expect(style).toContain("min-height: 10px");
      expect(style).toContain("max-height: 20px");
      expect(style).not.toContain("lh");
    });

    it("assigns no --vpg-* property inline", () => {
      render(<Textarea aria-label="Notes" autoGrow maxRows={8} />);
      expect(screen.getByRole("textbox", { name: "Notes" }).getAttribute("style")).not.toContain("--vpg-");
    });
  });
});
