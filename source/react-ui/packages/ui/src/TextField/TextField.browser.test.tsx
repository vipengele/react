import { ThemeProvider } from "@vipengele/react-tokens";
import { cleanup, render, screen } from "@testing-library/react";
import { type ReactNode, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { TextField } from "./TextField.js";

// The chromium project has no setup file, so nothing auto-cleans between tests the way the
// jsdom project's does; without this every render after the first collides with the previous
// one and queries start matching more than one field.
afterEach(cleanup);

const input = () => screen.getByRole("textbox", { name: "Query" });
const clearButton = () => screen.getByRole("button", { name: "Clear" });
const queryClearButton = () => screen.queryByRole("button", { name: "Clear" });

function renderThemed(ui: ReactNode) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

describe("TextField's clear button, in a real engine", () => {
  it("empties an uncontrolled input typed into, and returns focus to it", async () => {
    const onChange = vi.fn();
    const onBlur = vi.fn();
    renderThemed(<TextField aria-label="Query" clearable onChange={onChange} onBlur={onBlur} />);

    await userEvent.type(input(), "shoes");
    expect(input()).toHaveValue("shoes");
    onChange.mockClear();

    await userEvent.click(clearButton());

    expect(input()).toHaveValue("");
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(input()).toHaveFocus();
    expect(onBlur).not.toHaveBeenCalled();
    expect(queryClearButton()).toBeNull();
  });

  it("reports an empty value to a controlled onChange whose parent resets its state", async () => {
    const seen = vi.fn();
    function Controlled() {
      const [value, setValue] = useState("shoes");
      return (
        <TextField
          aria-label="Query"
          clearable
          value={value}
          onChange={(event) => {
            seen(event.target.value);
            setValue(event.target.value);
          }}
        />
      );
    }
    renderThemed(<Controlled />);

    await userEvent.click(clearButton());

    expect(seen).toHaveBeenCalledExactlyOnceWith("");
    expect(input()).toHaveValue("");
    expect(input()).toHaveFocus();
    expect(queryClearButton()).toBeNull();

    await userEvent.type(input(), "hats");
    expect(input()).toHaveValue("hats");
    expect(clearButton()).toBeInTheDocument();
  });

  it("restores a controlled value the parent declines to clear", async () => {
    const seen = vi.fn();
    renderThemed(<TextField aria-label="Query" clearable value="shoes" onChange={(event) => seen(event.target.value)} />);

    await userEvent.click(clearButton());

    expect(seen).toHaveBeenCalledExactlyOnceWith("");
    expect(input()).toHaveValue("shoes");
    expect(clearButton()).toBeInTheDocument();
  });

  it("sits inside the field's border, after the caller's trailing content", () => {
    const { container } = renderThemed(
      <TextField aria-label="Query" clearable defaultValue="shoes" trailing={<span data-testid="unit">USD</span>} />,
    );
    const shell = (container.querySelector(".vpg-field-shell") as HTMLElement).getBoundingClientRect();
    const unit = screen.getByTestId("unit").getBoundingClientRect();
    const button = clearButton().getBoundingClientRect();

    expect(button.left).toBeGreaterThanOrEqual(unit.right);
    expect(button.right).toBeLessThanOrEqual(shell.right);
    expect(input().getBoundingClientRect().right).toBeLessThanOrEqual(unit.left);
  });
});
