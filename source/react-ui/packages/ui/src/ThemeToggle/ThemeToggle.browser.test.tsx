import { ThemeProvider, type ThemeProviderProps } from "@vipengele/react-tokens";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cdp, userEvent } from "vitest/browser";
import { ThemeToggle, type ThemeToggleProps } from "./ThemeToggle.js";

/**
 * Arrow-key movement between the radios, the laid-out segments and the mode a `"system"`
 * preference paints in are all the engine's: jsdom moves no focus on an arrow key, lays nothing
 * out, evaluates no media query and applies no cascade, so none of these assertions would mean
 * anything there.
 */

// The chromium project has no setup file, so nothing auto-cleans between tests the way the
// jsdom project's does; without this every render after the first collides with the previous
// one and `getByRole` starts matching more than one radio group.
afterEach(cleanup);

/**
 * Drives Chromium's own media emulation over CDP, which is what makes
 * `(prefers-color-scheme: dark)` match for real — for the base stylesheet's media rule and for
 * `matchMedia` alike. Passing `null` clears the override and returns the page to the host's
 * preference.
 */
async function emulateColorScheme(value: "light" | "dark" | null) {
  await cdp().send("Emulation.setEmulatedMedia", {
    features: value === null ? [] : [{ name: "prefers-color-scheme", value }],
  });
}

afterEach(async () => {
  await emulateColorScheme(null);
});

function renderToggle(toggle: ThemeToggleProps = {}, provider: Omit<ThemeProviderProps, "children"> = {}) {
  return render(
    <ThemeProvider data-testid="root" {...provider}>
      <ThemeToggle {...toggle} />
    </ThemeProvider>,
  );
}

function radio(name: string): HTMLInputElement {
  return screen.getByRole("radio", { name }) as HTMLInputElement;
}

/** The segment — the `<label>` that draws the fill — wrapping the named radio. */
function segmentOf(name: string): HTMLElement {
  return radio(name).closest("label") as HTMLElement;
}

function root(): HTMLElement {
  return screen.getByTestId("root");
}

/** The colour scheme the provider's root paints in, which every `light-dark()` colour follows. */
function paintedScheme(): string {
  return getComputedStyle(root()).colorScheme;
}

/** Resolves `var(token)` as a length inside the mounted root. */
function resolvedLength(token: string): number {
  const probe = document.createElement("span");
  probe.style.setProperty("min-height", `var(${token})`);
  root().append(probe);
  const value = Number.parseFloat(getComputedStyle(probe).minHeight);
  probe.remove();
  return value;
}

describe("ThemeToggle keyboard", () => {
  it("takes Tab focus on the selected preference's radio", async () => {
    renderToggle({}, { defaultColorMode: "dark" });

    await userEvent.tab();

    expect(document.activeElement).toBe(radio("Dark"));
  });

  it("sets the provider's preference with the arrow keys", async () => {
    const onColorModeChange = vi.fn();
    renderToggle({}, { onColorModeChange });

    await userEvent.tab();
    expect(document.activeElement).toBe(radio("System"));

    await userEvent.keyboard("{ArrowLeft}");

    expect(document.activeElement).toBe(radio("Dark"));
    expect(radio("Dark").checked).toBe(true);
    expect(onColorModeChange).toHaveBeenLastCalledWith("dark");
    expect(root()).toHaveAttribute("data-vpg-mode", "dark");
    expect(paintedScheme()).toBe("dark");

    await userEvent.keyboard("{ArrowLeft}");

    expect(radio("Light").checked).toBe(true);
    expect(onColorModeChange).toHaveBeenLastCalledWith("light");
    expect(root()).toHaveAttribute("data-vpg-mode", "light");
    expect(paintedScheme()).toBe("light");
  });

  it("wraps from the last segment to the first", async () => {
    const onColorModeChange = vi.fn();
    renderToggle({}, { onColorModeChange });

    await userEvent.tab();
    await userEvent.keyboard("{ArrowRight}");

    expect(document.activeElement).toBe(radio("Light"));
    expect(radio("Light").checked).toBe(true);
    expect(onColorModeChange).toHaveBeenCalledWith("light");
  });

  it("leaves a controlled provider's selection where the caller holds it", async () => {
    const onColorModeChange = vi.fn();
    renderToggle({}, { colorMode: "light", onColorModeChange });

    await userEvent.tab();
    await userEvent.keyboard("{ArrowRight}");

    expect(onColorModeChange).toHaveBeenCalledWith("dark");
    expect(radio("Light").checked).toBe(true);
    expect(root()).toHaveAttribute("data-vpg-mode", "light");
  });
});

describe("ThemeToggle geometry", () => {
  it("lays the control out at the height --vpg-size-md resolves to", () => {
    renderToggle();

    const expected = resolvedLength("--vpg-size-md");
    expect(expected).toBeGreaterThan(0);
    expect(screen.getByRole("radiogroup", { name: "Color mode" }).getBoundingClientRect().height).toBeCloseTo(expected, 1);
  });

  it("lays the three segments out side by side in one row, each the same size", () => {
    renderToggle();

    const [light, dark, system] = ["Light", "Dark", "System"].map((name) => segmentOf(name).getBoundingClientRect()) as [
      DOMRect,
      DOMRect,
      DOMRect,
    ];

    expect(light.width).toBeGreaterThan(0);
    expect(dark.width).toBeCloseTo(light.width, 1);
    expect(system.width).toBeCloseTo(light.width, 1);
    expect(dark.top).toBeCloseTo(light.top, 1);
    expect(system.top).toBeCloseTo(light.top, 1);
    expect(dark.left).toBeGreaterThanOrEqual(light.right);
    expect(system.left).toBeGreaterThanOrEqual(dark.right);
  });

  it("draws each segment's icon at a visible size inside its segment", () => {
    renderToggle();

    for (const name of ["Light", "Dark", "System"]) {
      const segment = segmentOf(name).getBoundingClientRect();
      const icon = (segmentOf(name).querySelector("svg") as SVGSVGElement).getBoundingClientRect();

      expect(icon.width, name).toBeGreaterThan(0);
      expect(icon.height, name).toBeGreaterThan(0);
      expect(icon.left, name).toBeGreaterThanOrEqual(segment.left);
      expect(icon.right, name).toBeLessThanOrEqual(segment.right);
      expect(icon.top, name).toBeGreaterThanOrEqual(segment.top);
      expect(icon.bottom, name).toBeLessThanOrEqual(segment.bottom);
    }
  });
});

describe("ThemeToggle under a real prefers-color-scheme", () => {
  for (const scheme of ["light", "dark"] as const) {
    it(`keeps system selected while the page paints in ${scheme} under prefers-color-scheme: ${scheme}`, async () => {
      await emulateColorScheme(scheme);

      renderToggle();

      expect(radio("System").checked).toBe(true);
      expect(root()).not.toHaveAttribute("data-vpg-mode");
      expect(paintedScheme()).toBe(scheme);
    });
  }

  it("keeps system selected when the system preference flips under it", async () => {
    await emulateColorScheme("light");
    renderToggle();
    expect(paintedScheme()).toBe("light");

    await emulateColorScheme("dark");

    expect(paintedScheme()).toBe("dark");
    expect(radio("System").checked).toBe(true);
  });

  it("paints an explicit preference over the system one, and system again once it is chosen", async () => {
    await emulateColorScheme("dark");
    renderToggle();

    await userEvent.click(segmentOf("Light"));

    expect(radio("Light").checked).toBe(true);
    expect(paintedScheme()).toBe("light");

    await userEvent.click(segmentOf("System"));

    expect(radio("System").checked).toBe(true);
    expect(root()).not.toHaveAttribute("data-vpg-mode");
    expect(paintedScheme()).toBe("dark");
  });
});
