import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TextField } from "./TextField.js";

describe("TextField", () => {
  it("renders a native text input by default", () => {
    render(<TextField aria-label="Email" />);
    const field = screen.getByRole("textbox", { name: "Email" });
    expect(field).toBeInTheDocument();
    expect(field).toHaveAttribute("type", "text");
  });

  it("renders with a different native input type", () => {
    render(<TextField aria-label="Password" type="password" />);
    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "password");
  });

  it("composes a caller-supplied className alongside its own classes", () => {
    render(<TextField aria-label="Email" className="custom" />);
    const field = screen.getByRole("textbox", { name: "Email" });
    expect(field).toHaveClass("custom");
    expect(field).toHaveClass("tandiko-text-field");
  });

  it("forwards arbitrary attributes to the input", () => {
    render(<TextField aria-label="Email" data-testid="target" placeholder="you@example.com" />);
    expect(screen.getByTestId("target")).toHaveAttribute("placeholder", "you@example.com");
  });

  describe("stylesheet", () => {
    it("injects its stylesheet once for any number of text fields", () => {
      render(
        <>
          <TextField aria-label="First" />
          <TextField aria-label="Second" />
        </>,
      );

      const styles = document.head.querySelectorAll('style[data-href="tandiko-text-field"]');
      expect(styles).toHaveLength(1);
      expect(styles[0]?.textContent).toContain(".tandiko-text-field {");
    });

    it("never assigns a --tandiko-* custom property inline", () => {
      render(<TextField aria-label="Email" />);
      expect(screen.getByRole("textbox", { name: "Email" }).getAttribute("style")).toBeNull();
    });
  });
});
