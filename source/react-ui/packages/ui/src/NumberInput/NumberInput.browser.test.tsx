import { ThemeProvider } from "@vipengele/react-tokens";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { NumberInput } from "./NumberInput.js";

// The chromium project has no setup file, so nothing auto-cleans between tests the way the
// jsdom project's does; without this every render after the first collides with the previous
// one and queries start matching more than one field.
afterEach(cleanup);

const field = () => screen.getByRole("spinbutton", { name: "Amount" });
const steppers = () =>
  [screen.getByRole("button", { name: "Increase value" }), screen.getByRole("button", { name: "Decrease value" })] as const;

/** Real focus, not a synthesised event: `:focus-visible` is a real-engine pseudo-class. */
const focus = (element: HTMLElement) => act(() => element.focus());

/** The colour a `--vpg-*` role token resolves to, read the same way `resolvedLength` reads a
 * length — consumed as `outline-color` on a probe inside the themed root, since that is the
 * property the stepper's focus ring assigns it to. */
function resolvedOutlineColour(token: string): string {
  const probe = document.createElement("span");
  probe.style.outlineColor = `var(${token})`;
  (document.querySelector(".vpg-root") as HTMLElement).append(probe);
  const colour = getComputedStyle(probe).outlineColor;
  probe.remove();
  return colour;
}

/**
 * The pixel length a token resolves to, read by consuming it as a real property on a probe
 * appended inside the themed root — a custom property read back off `getPropertyValue` is its
 * unresolved token stream, never a resolved length, and a property assigned via `ThemeProvider`'s
 * inline `style` on `.vpg-root` reaches only that element's own descendants. Mirrors
 * `theme-scalars.browser.test.ts`'s `resolveRadii` and `FieldShell.browser.test.tsx`'s
 * `resolvedColour`.
 */
function resolvedLength(token: string, property: "borderTopLeftRadius" | "width" | "height"): string {
  const probe = document.createElement("div");
  const cssProperty = property === "borderTopLeftRadius" ? "borderRadius" : property;
  probe.style[cssProperty as "borderRadius" | "width" | "height"] = `var(${token})`;
  (document.querySelector(".vpg-root") as HTMLElement).append(probe);
  const value = getComputedStyle(probe)[property];
  probe.remove();
  return value;
}

describe("NumberInput under a real ThemeProvider", () => {
  it("fills the field's height with its control, marked for the shell like every other field", () => {
    const { container } = render(
      <ThemeProvider>
        <NumberInput aria-label="Amount" />
      </ThemeProvider>,
    );

    const input = field();
    expect(input).toHaveClass("vpg-field-shell-control");
    const shell = container.querySelector(".vpg-field-shell") as HTMLElement;
    expect(input.getBoundingClientRect().height).toBeCloseTo(shell.clientHeight, 0);
  });

  it("draws the accent focus ring on a stepper button that takes real focus", () => {
    render(
      <ThemeProvider>
        <NumberInput aria-label="Amount" defaultValue={1} steppers />
      </ThemeProvider>,
    );

    const [increase] = steppers();
    focus(increase);

    const outlineWidth = resolvedLength("--vpg-focus-ring-width", "width");
    const outlineColour = resolvedOutlineColour("--vpg-accent-ring");
    const styles = getComputedStyle(increase);
    expect(styles.outlineStyle).toBe("solid");
    expect(styles.outlineWidth).toBe(outlineWidth);
    expect(styles.outlineColor).toBe(outlineColour);
  });

  it("draws no outline on a stepper button that never took focus", () => {
    render(
      <ThemeProvider>
        <NumberInput aria-label="Amount" defaultValue={1} steppers />
      </ThemeProvider>,
    );

    const [, decrease] = steppers();
    expect(getComputedStyle(decrease).outlineStyle).toBe("none");
  });

  it("sizes the stepper icon off the icon scale's small step", () => {
    const { container } = render(
      <ThemeProvider>
        <NumberInput aria-label="Amount" defaultValue={1} steppers />
      </ThemeProvider>,
    );

    const icon = container.querySelector(".vpg-number-input-stepper-icon") as HTMLElement;
    const iconSm = resolvedLength("--vpg-icon-sm", "width");
    expect(getComputedStyle(icon).width).toBe(iconSm);
    expect(getComputedStyle(icon).height).toBe(iconSm);
  });

  it("rounds a stepper button off the small radius step", () => {
    const { container } = render(
      <ThemeProvider>
        <NumberInput aria-label="Amount" defaultValue={1} steppers />
      </ThemeProvider>,
    );

    const [increase] = steppers();
    const radiusSm = resolvedLength("--vpg-radius-sm", "borderTopLeftRadius");
    expect(getComputedStyle(increase).borderTopLeftRadius).toBe(radiusSm);
    expect(container.querySelector(".vpg-number-input-stepper-icon")).toBeTruthy();
  });
});
