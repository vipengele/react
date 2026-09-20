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
    expect(field).toHaveClass("vpg-text-field");
  });

  it("forwards arbitrary attributes to the input", () => {
    render(<TextField aria-label="Email" data-testid="target" placeholder="you@example.com" />);
    expect(screen.getByTestId("target")).toHaveAttribute("placeholder", "you@example.com");
  });

  describe("shell", () => {
    it("renders the input inside a field shell", () => {
      render(<TextField aria-label="Email" />);
      const field = screen.getByRole("textbox", { name: "Email" });
      expect(field.parentElement).toHaveClass("vpg-field-shell");
    });

    it("keeps the chrome on the shell and off the input", () => {
      render(<TextField aria-label="Email" className="custom" />);
      const field = screen.getByRole("textbox", { name: "Email" });
      expect(field).not.toHaveClass("vpg-field-shell");
      expect(field.parentElement).not.toHaveClass("vpg-text-field");
      expect(field.parentElement).not.toHaveClass("custom");
    });

    it("renders a leading adornment before the input in the shell's leading slot", () => {
      render(<TextField aria-label="Amount" leading={<span>$</span>} />);
      const field = screen.getByRole("textbox", { name: "Amount" });
      const leading = field.parentElement?.querySelector(".vpg-field-shell-leading");
      expect(leading).toHaveTextContent("$");
      expect(leading?.nextElementSibling).toBe(field);
    });

    it("renders a trailing adornment after the input in the shell's trailing slot", () => {
      render(<TextField aria-label="Amount" trailing={<span>USD</span>} />);
      const field = screen.getByRole("textbox", { name: "Amount" });
      const trailing = field.parentElement?.querySelector(".vpg-field-shell-trailing");
      expect(trailing).toHaveTextContent("USD");
      expect(field.nextElementSibling).toBe(trailing);
    });

    it("renders no slot element for an adornment it is not given", () => {
      render(<TextField aria-label="Email" />);
      const shell = screen.getByRole("textbox", { name: "Email" }).parentElement;
      expect(shell?.querySelector(".vpg-field-shell-leading")).toBeNull();
      expect(shell?.querySelector(".vpg-field-shell-trailing")).toBeNull();
    });

    it("injects the shell's stylesheet alongside its own", () => {
      render(<TextField aria-label="Email" />);
      const styles = document.head.querySelectorAll('style[data-href="vpg-field-shell"]');
      expect(styles).toHaveLength(1);
      expect(styles[0]?.textContent).toContain(".vpg-field-shell {");
    });
  });

  describe("stylesheet", () => {
    it("injects its stylesheet once for any number of text fields", () => {
      render(
        <>
          <TextField aria-label="First" />
          <TextField aria-label="Second" />
        </>,
      );

      const styles = document.head.querySelectorAll('style[data-href="vpg-text-field"]');
      expect(styles).toHaveLength(1);
      expect(styles[0]?.textContent).toContain(".vpg-text-field {");
    });

    it("never assigns a --vpg-* custom property inline", () => {
      render(<TextField aria-label="Email" />);
      expect(screen.getByRole("textbox", { name: "Email" }).getAttribute("style")).toBeNull();
    });
  });
});
