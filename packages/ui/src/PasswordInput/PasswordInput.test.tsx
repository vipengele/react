import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PasswordInput } from "./PasswordInput.js";

describe("PasswordInput", () => {
  it("starts masked", () => {
    render(<PasswordInput aria-label="Password" />);
    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "password");
  });

  it("reveals the value and reflects it in aria-pressed when the button is clicked", () => {
    render(<PasswordInput aria-label="Password" />);
    const button = screen.getByRole("button", { name: "Show password" });

    fireEvent.click(button);

    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "text");
    expect(button).toHaveAttribute("aria-pressed", "true");
  });

  it("re-masks the value on a second click", () => {
    render(<PasswordInput aria-label="Password" />);

    fireEvent.click(screen.getByRole("button", { name: "Show password" }));
    fireEvent.click(screen.getByRole("button", { name: "Hide password" }));

    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "password");
    expect(screen.getByRole("button", { name: "Show password" })).toHaveAttribute("aria-pressed", "false");
  });

  it("changes the button's accessible label with the revealed state", () => {
    render(<PasswordInput aria-label="Password" />);

    expect(screen.getByRole("button", { name: "Show password" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Show password" }));

    expect(screen.getByRole("button", { name: "Hide password" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Show password" })).not.toBeInTheDocument();
  });

  it("keeps focus on the button across a toggle", () => {
    render(<PasswordInput aria-label="Password" />);
    const button = screen.getByRole("button", { name: "Show password" });

    button.focus();
    expect(button).toHaveFocus();

    fireEvent.click(button);

    expect(screen.getByRole("button", { name: "Hide password" })).toHaveFocus();
  });

  it("disables both the input and the reveal button when disabled", () => {
    render(<PasswordInput aria-label="Password" disabled />);

    expect(screen.getByLabelText("Password")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Show password" })).toBeDisabled();
  });

  it("composes a caller-supplied className alongside the input's own classes", () => {
    render(<PasswordInput aria-label="Password" className="custom" />);
    const field = screen.getByLabelText("Password");
    expect(field).toHaveClass("custom");
    expect(field).toHaveClass("tandiko-text-field");
  });

  it("forwards arbitrary attributes to the input", () => {
    render(<PasswordInput aria-label="Password" data-testid="target" placeholder="Enter password" />);
    expect(screen.getByTestId("target")).toHaveAttribute("placeholder", "Enter password");
  });

  describe("stylesheet", () => {
    it("injects its stylesheet once for any number of password inputs", () => {
      render(
        <>
          <PasswordInput aria-label="First" />
          <PasswordInput aria-label="Second" />
        </>,
      );

      const styles = document.head.querySelectorAll('style[data-href="tandiko-password-input"]');
      expect(styles).toHaveLength(1);
      expect(styles[0]?.textContent).toContain(".tandiko-password-input-toggle {");
    });

    it("never assigns a --tandiko-* custom property inline", () => {
      render(<PasswordInput aria-label="Password" />);
      expect(screen.getByLabelText("Password").getAttribute("style")).toBeNull();
      expect(screen.getByRole("button", { name: "Show password" }).getAttribute("style")).toBeNull();
    });
  });
});
