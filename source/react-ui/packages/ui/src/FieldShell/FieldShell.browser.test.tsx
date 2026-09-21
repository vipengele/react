import { ThemeProvider } from "@vipengele/react-tokens";
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

/** The colour a `--vpg-*` role token resolves to, read by consuming it as a real property on a
 * probe inside the themed root — a custom property read back off `getPropertyValue` is its
 * unresolved token stream. */
function resolvedColour(token: string): string {
  const probe = document.createElement("span");
  probe.style.color = `var(${token})`;
  (document.querySelector(".vpg-root") as HTMLElement).append(probe);
  const colour = getComputedStyle(probe).color;
  probe.remove();
  return colour;
}

/** The width an injected element is given, so what it takes from the centre is a known number
 * rather than one its own content decides. */
const INTRUDER_WIDTH = 24;

/** An element a page injects into the field — a password manager appending its own custom element
 * — landing after every child the component rendered, which is the position the shell's fallback
 * hands the centre's free space to. */
function injectInto(shell: HTMLElement): HTMLElement {
  const intruder = document.createElement("keeper-lock");
  intruder.style.width = `${INTRUDER_WIDTH}px`;
  intruder.style.height = "16px";
  shell.append(intruder);
  return intruder;
}

function shellOf(container: HTMLElement) {
  const shell = container.querySelector(".vpg-field-shell");
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

  describe("an element a page injects into the field", () => {
    it("holds the injected element at its own width beside a marked control", () => {
      const { container } = render(
        <ThemeProvider>
          <div style={{ width: "300px" }}>
            <FieldShell>
              <input aria-label="Amount" className="vpg-field-shell-control" />
            </FieldShell>
          </div>
        </ThemeProvider>,
      );

      const intruder = injectInto(shellOf(container));

      // The marker names the control outright, so the centre's free space never reaches an
      // element the component did not render, wherever among the children it lands.
      expect(intruder.getBoundingClientRect().width).toBeCloseTo(INTRUDER_WIDTH, 0);
    });

    it("keeps a password input's reveal button against the field's trailing edge", () => {
      const { container } = render(
        <ThemeProvider>
          <div style={{ width: "700px" }}>
            <PasswordInput aria-label="Password" />
          </div>
        </ThemeProvider>,
      );
      const shell = shellOf(container);

      injectInto(shell);

      const toggle = screen.getByLabelText("Show password");
      const styles = getComputedStyle(shell);
      const contentRight = shell.getBoundingClientRect().right - shell.clientLeft - Number.parseFloat(styles.paddingRight);
      // The injected element takes its own width and one of the shell's gaps; everything else in
      // the centre is the control's, so the button stays where the trailing edge puts it rather
      // than floating beside the text.
      expect(contentRight - toggle.getBoundingClientRect().right).toBeLessThanOrEqual(
        INTRUDER_WIDTH + Number.parseFloat(styles.columnGap) + 0.5,
      );
    });
  });

  describe("the open state", () => {
    it("marks a field whose control has its listbox open with the accent border and no ring", () => {
      const { container } = render(
        <ThemeProvider>
          <FieldShell>
            <button type="button" aria-expanded="true">
              Fruit
            </button>
          </FieldShell>
        </ThemeProvider>,
      );

      const shell = shellOf(container);
      expect(getComputedStyle(shell).borderTopColor).toBe(resolvedColour("--vpg-accent"));
      expect(getComputedStyle(shell).boxShadow).toBe("none");
    });

    it("keeps the danger border on an open field whose control is invalid", () => {
      const { container } = render(
        <ThemeProvider>
          <FieldShell>
            <button type="button" aria-expanded="true" aria-invalid="true">
              Fruit
            </button>
          </FieldShell>
        </ThemeProvider>,
      );

      expect(getComputedStyle(shellOf(container)).borderTopColor).toBe(resolvedColour("--vpg-danger"));
    });

    it("leaves the resting border when an expanded element sits in the trailing slot", () => {
      const { container } = render(
        <ThemeProvider>
          <FieldShell
            trailing={
              <button type="button" aria-expanded="true">
                Options
              </button>
            }
          >
            <input aria-label="Amount" />
          </FieldShell>
        </ThemeProvider>,
      );

      expect(getComputedStyle(shellOf(container)).borderTopColor).toBe(resolvedColour("--vpg-border-strong"));
    });
  });
});
