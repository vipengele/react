import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ClearButton } from "./ClearButton.js";

describe("ClearButton", () => {
  it("renders a non-submitting button named by its label", () => {
    render(<ClearButton label="Clear selection" onClear={() => {}} />);

    const button = screen.getByRole("button", { name: "Clear selection" });
    expect(button).toHaveAttribute("type", "button");
    expect(button).toHaveClass("vpg-clear-button");
  });

  it("hides its icon from the accessibility tree", () => {
    render(<ClearButton label="Clear selection" onClear={() => {}} />);

    const icon = screen.getByRole("button").querySelector("svg");
    expect(icon).toHaveAttribute("aria-hidden", "true");
  });

  it("calls onClear when clicked", () => {
    const onClear = vi.fn();
    render(<ClearButton label="Clear selection" onClear={onClear} />);

    fireEvent.click(screen.getByRole("button"));

    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it("prevents the default of a mouse-down, so the press never moves focus off the field", () => {
    render(<ClearButton label="Clear selection" onClear={() => {}} />);

    expect(fireEvent.mouseDown(screen.getByRole("button"))).toBe(false);
  });

  it("disables the button and never calls onClear while disabled", () => {
    const onClear = vi.fn();
    render(<ClearButton label="Clear selection" onClear={onClear} disabled />);

    const button = screen.getByRole("button");
    fireEvent.click(button);

    expect(button).toBeDisabled();
    expect(onClear).not.toHaveBeenCalled();
  });

  it("injects its stylesheet once for any number of buttons", () => {
    render(
      <>
        <ClearButton label="Clear first" onClear={() => {}} />
        <ClearButton label="Clear second" onClear={() => {}} />
      </>,
    );
    // React hoists the style into `<head>` and rewrites `href`/`precedence` to
    // `data-href`/`data-precedence`, keyed on `href` for de-duplication.
    const styles = document.querySelectorAll('style[data-href="vpg-clear-button"]');
    expect(styles).toHaveLength(1);
    expect(styles[0]?.textContent).toContain(".vpg-clear-button {");
  });
});
