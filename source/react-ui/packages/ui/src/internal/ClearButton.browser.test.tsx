import { ThemeProvider } from "@vipengele/react-tokens";
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { ClearButton } from "./ClearButton.js";

// The chromium project has no setup file, so nothing auto-cleans between tests the way the
// jsdom project's does; without this every render after the first collides with the previous
// one, and a cursor left over from a hover keeps the next button hovered.
afterEach(async () => {
  await userEvent.unhover(document.body);
  cleanup();
});

const TRANSPARENT = "rgba(0, 0, 0, 0)";

function renderThemed(ui: ReactNode) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

/** The colour a `--vpg-*` role token resolves to, read by consuming it as a real property on a
 * probe inside the themed root — a custom property read back off `getPropertyValue` is its
 * unresolved token stream. */
function resolved(property: "backgroundColor" | "color", token: string): string {
  const probe = document.createElement("span");
  probe.style[property] = `var(${token})`;
  (document.querySelector(".vpg-root") as HTMLElement).append(probe);
  const colour = getComputedStyle(probe)[property];
  probe.remove();
  return colour;
}

/** Finishes the button's colour transitions before reading its style; a mid-transition read sees
 * a blend. */
function settledStyle(element: Element): CSSStyleDeclaration {
  for (const animation of element.getAnimations()) {
    animation.finish();
  }
  return getComputedStyle(element);
}

const button = () => screen.getByRole("button", { name: "Clear" });

describe("ClearButton, under a real ThemeProvider", () => {
  it("sizes its icon to the icon scale's sm step", () => {
    renderThemed(<ClearButton label="Clear" onClear={() => {}} />);

    const icon = button().querySelector("svg") as SVGElement;
    const { width, height } = icon.getBoundingClientRect();
    expect(width).toBeCloseTo(14, 0);
    expect(height).toBeCloseTo(14, 0);
  });

  it("draws no background and the muted ink at rest", () => {
    renderThemed(<ClearButton label="Clear" onClear={() => {}} />);

    expect(settledStyle(button()).backgroundColor).toBe(TRANSPARENT);
    expect(settledStyle(button()).color).toBe(resolved("color", "--vpg-ink-muted"));
  });

  it("takes the accent wash and full ink under hover", async () => {
    renderThemed(<ClearButton label="Clear" onClear={() => {}} />);
    const wash = resolved("backgroundColor", "--vpg-accent-wash");
    expect(wash).not.toBe(TRANSPARENT);

    await userEvent.hover(button());

    expect(settledStyle(button()).backgroundColor).toBe(wash);
    expect(settledStyle(button()).color).toBe(resolved("color", "--vpg-ink"));
  });

  it("draws its own focus ring when reached by keyboard", async () => {
    renderThemed(<ClearButton label="Clear" onClear={() => {}} />);
    expect(getComputedStyle(button()).outlineStyle).toBe("none");

    await userEvent.tab();

    expect(button()).toHaveFocus();
    expect(getComputedStyle(button()).outlineStyle).toBe("solid");
    expect(Number.parseFloat(getComputedStyle(button()).outlineWidth)).toBeGreaterThan(0);
  });

  it("shows a not-allowed cursor while disabled, with no hover wash and no fade of its own", async () => {
    renderThemed(<ClearButton label="Clear" onClear={() => {}} disabled />);

    await userEvent.hover(button(), { force: true });

    expect(settledStyle(button()).cursor).toBe("not-allowed");
    expect(settledStyle(button()).backgroundColor).toBe(TRANSPARENT);
    expect(getComputedStyle(button()).opacity).toBe("1");
  });

  it("clears without taking focus from the input beside it", async () => {
    const onClear = vi.fn();
    const onBlur = vi.fn();
    renderThemed(
      <>
        <input aria-label="Query" onBlur={onBlur} />
        <ClearButton label="Clear" onClear={onClear} />
      </>,
    );
    const input = screen.getByRole("textbox", { name: "Query" });
    input.focus();

    await userEvent.click(button());

    expect(onClear).toHaveBeenCalledTimes(1);
    expect(input).toHaveFocus();
    expect(onBlur).not.toHaveBeenCalled();
  });
});
