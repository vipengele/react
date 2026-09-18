import { ThemeProvider } from "@tandiko/tokens";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PasswordInput } from "../PasswordInput/PasswordInput.js";
import { TextField } from "../TextField/TextField.js";
import { FieldShell } from "./FieldShell.js";

// The chromium project has no setup file, so nothing auto-cleans between tests the way the
// jsdom project's does; without this every render after the first collides with the previous
// one and queries start matching more than one field.
afterEach(cleanup);

/** The size scale's default control step, which the shell takes as its floor, is 32px at the
 * default seed. Only a real engine resolves it: the token is a `calc()` over the seed, and its
 * value read back off a custom property is that expression, not a length. */
const CONTROL_STEP = 32;

function shellOf(container: HTMLElement) {
  const shell = container.querySelector(".tandiko-field-shell");
  expect(shell).not.toBeNull();
  return shell as HTMLElement;
}

describe("FieldShell under a real ThemeProvider", () => {
  it("stands a single-line field at the size scale's control step", () => {
    const { container } = render(
      <ThemeProvider>
        <TextField aria-label="Amount" />
      </ThemeProvider>,
    );

    expect(shellOf(container).getBoundingClientRect().height).toBeCloseTo(CONTROL_STEP, 0);
  });

  it("stands a field with an adornment at the same control step", () => {
    const { container } = render(
      <ThemeProvider>
        <PasswordInput aria-label="Password" />
      </ThemeProvider>,
    );

    expect(shellOf(container).getBoundingClientRect().height).toBeCloseTo(CONTROL_STEP, 0);
  });

  it("fills the field's height with a text field's control", () => {
    const { container } = render(
      <ThemeProvider>
        <TextField aria-label="Amount" />
      </ThemeProvider>,
    );

    const input = screen.getByRole("textbox", { name: "Amount" });
    // `clientHeight` is the shell's content box, the box its centre has to cover. A control
    // shorter than that leaves a dead strip along the top and bottom of the field where a click
    // lands on the shell and focuses nothing.
    expect(input.getBoundingClientRect().height).toBeCloseTo(shellOf(container).clientHeight, 0);
  });

  it("fills the field's height with a password input's control", () => {
    const { container } = render(
      <ThemeProvider>
        <PasswordInput aria-label="Password" />
      </ThemeProvider>,
    );

    const input = screen.getByLabelText("Password");

    expect(input.getBoundingClientRect().height).toBeCloseTo(shellOf(container).clientHeight, 0);
  });

  it("grows past the control step for a centre that wraps onto a second line", () => {
    const { container } = render(
      <ThemeProvider>
        <div style={{ width: "200px" }}>
          <FieldShell>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
              {["alpha", "bravo", "charlie", "delta", "echo"].map((word) => (
                <span key={word} style={{ padding: "4px 8px", background: "#eee" }}>
                  {word}
                </span>
              ))}
            </div>
          </FieldShell>
        </div>
      </ThemeProvider>,
    );

    expect(shellOf(container).getBoundingClientRect().height).toBeGreaterThan(CONTROL_STEP);
  });

  it("gives the whole centre to a lone control", () => {
    const { container } = render(
      <ThemeProvider>
        <div style={{ width: "300px" }}>
          <FieldShell>
            <input aria-label="Amount" />
          </FieldShell>
        </div>
      </ThemeProvider>,
    );

    const shell = shellOf(container);
    const input = screen.getByRole("textbox", { name: "Amount" });
    // The shell's horizontal padding is the only thing between the two boxes' widths, so the
    // input filling the centre means it is wider than the intrinsic width a bare input takes.
    expect(input.getBoundingClientRect().width).toBeGreaterThan(shell.getBoundingClientRect().width - 40);
  });

  it("leaves the remainder of a multi-element centre to its last element", () => {
    const { container } = render(
      <ThemeProvider>
        <div style={{ width: "400px" }}>
          <FieldShell>
            <span style={{ display: "flex" }}>chip</span>
            <input aria-label="Amount" />
          </FieldShell>
        </div>
      </ThemeProvider>,
    );

    const shell = shellOf(container);
    const chips = container.querySelector("span[style]") as HTMLElement;
    const input = screen.getByRole("textbox", { name: "Amount" });

    // The chip row stays at its content width; anything the shell has left over goes to the
    // control beside it, rather than being split between the two.
    expect(chips.getBoundingClientRect().width).toBeLessThan(shell.getBoundingClientRect().width / 4);
    expect(input.getBoundingClientRect().width).toBeGreaterThan(shell.getBoundingClientRect().width / 2);
  });
});
