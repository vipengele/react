import { cleanup, render } from "@testing-library/react";
import { ThemeProvider } from "@vipengele/react-tokens";
import type { ReactNode } from "react";
import { LineChart } from "recharts";
import { afterEach, describe, expect, it } from "vitest";
import { ThemedChartContainer } from "./ThemedChartContainer.js";

/**
 * The container's size comes from measuring its parent with a real `ResizeObserver`, and its
 * colours are `var()` reads of `light-dark()` roles. jsdom neither lays out nor resolves either,
 * so the fill, the aspect, the chart's size under the frame and the themed colours are only
 * observable in a real engine.
 */

// The chromium project has no setup file, so nothing auto-cleans between tests the way the
// jsdom project's does; without this every render after the first sits beside the previous one
// and `.vpg-chart-container` matches more than one element.
afterEach(cleanup);

const PARENT_WIDTH = 480;
const FRAME = 1;

/** Mounts `chart` in a parent of fixed width, so the container's expected width is known. */
function renderInParent(chart: ReactNode) {
  const { container } = render(<div style={{ width: PARENT_WIDTH }}>{chart}</div>);
  return container.querySelector(".vpg-chart-container") as HTMLElement;
}

/** Resolves until `read` returns a value, or fails after the engine has had a second to lay out. */
async function waitFor<T>(read: () => T | null | undefined): Promise<T> {
  const deadline = performance.now() + 1000;
  for (;;) {
    const value = read();
    if (value != null) return value;
    if (performance.now() > deadline) throw new Error("timed out waiting for the chart to lay out");
    await new Promise(requestAnimationFrame);
  }
}

/** Resolves a token to the colour the engine computes for it inside the mounted root. */
function resolvedColour(token: string): string {
  const probe = document.createElement("span");
  probe.style.color = `var(${token})`;
  (document.querySelector(".vpg-root") as HTMLElement).append(probe);
  const colour = getComputedStyle(probe).color;
  probe.remove();
  return colour;
}

describe("ThemedChartContainer geometry in a real engine", () => {
  it("fills its parent's width at the height it is given", () => {
    const box = renderInParent(
      <ThemedChartContainer height={300}>
        <LineChart data={[]} />
      </ThemedChartContainer>,
    ).getBoundingClientRect();

    expect(box.width).toBeCloseTo(PARENT_WIDTH, 1);
    expect(box.height).toBeCloseTo(300, 1);
  });

  it("derives its height from its width over an aspect", async () => {
    const element = renderInParent(
      <ThemedChartContainer aspect={2}>
        <LineChart data={[]} />
      </ThemedChartContainer>,
    );
    const surface = await waitFor(() => element.querySelector("svg.recharts-surface"));

    expect(surface.getBoundingClientRect().height).toBeCloseTo(PARENT_WIDTH / 2, 0);
  });

  it("lays the chart out at its full size, the frame taking none of it", async () => {
    const element = renderInParent(
      <ThemedChartContainer height={300}>
        <LineChart data={[]} />
      </ThemedChartContainer>,
    );
    const surface = await waitFor(() => element.querySelector("svg.recharts-surface"));
    const box = element.getBoundingClientRect();
    const chart = surface.getBoundingClientRect();

    expect(chart.width).toBeCloseTo(box.width, 0);
    expect(chart.height).toBeCloseTo(box.height, 0);
    expect(chart.left).toBeCloseTo(box.left, 0);
    expect(chart.top).toBeCloseTo(box.top, 0);
  });

  it("keeps the chart at its full size after the parent resizes", async () => {
    const element = renderInParent(
      <ThemedChartContainer height={300}>
        <LineChart data={[]} />
      </ThemedChartContainer>,
    );
    await waitFor(() => element.querySelector("svg.recharts-surface"));
    (element.parentElement as HTMLElement).style.width = `${PARENT_WIDTH / 2}px`;
    const surface = await waitFor(() => {
      const svg = element.querySelector("svg.recharts-surface");
      return svg && Math.round(svg.getBoundingClientRect().width) === PARENT_WIDTH / 2 ? svg : null;
    });

    expect(surface.getBoundingClientRect().width).toBeCloseTo(element.getBoundingClientRect().width, 0);
  });
});

describe("ThemedChartContainer colours under a real ThemeProvider", () => {
  it.each(["light", "dark"] as const)("takes its ink and border from the theme in %s mode", (colorMode) => {
    render(
      <ThemeProvider colorMode={colorMode}>
        <div style={{ width: PARENT_WIDTH }}>
          <ThemedChartContainer height={200}>
            <LineChart data={[]} />
          </ThemedChartContainer>
        </div>
      </ThemeProvider>,
    );
    const element = document.querySelector(".vpg-chart-container") as HTMLElement;
    const style = getComputedStyle(element);
    const ink = resolvedColour("--vpg-ink");
    const border = resolvedColour("--vpg-border");

    // An unresolved read serialises the token text; a token that resolved to nothing leaves a
    // transparent colour.
    expect(ink).not.toMatch(/var\(|--vpg-|transparent|rgba\(0, 0, 0, 0\)/);
    expect(border).not.toMatch(/var\(|--vpg-|transparent|rgba\(0, 0, 0, 0\)/);
    expect(style.color).toBe(ink);
    expect(style.outlineColor).toBe(border);
    expect(style.outlineStyle).toBe("solid");
    expect(style.outlineWidth).toBe(`${FRAME}px`);
    expect(style.outlineOffset).toBe(`-${FRAME}px`);
  });

  it("paints a child's currentColor with the theme's ink", async () => {
    render(
      <ThemeProvider colorMode="dark">
        <div style={{ width: PARENT_WIDTH }}>
          <ThemedChartContainer height={200}>
            <svg aria-hidden="true">
              <text className="probe" fill="currentColor">
                Axis
              </text>
            </svg>
          </ThemedChartContainer>
        </div>
      </ThemeProvider>,
    );
    const text = await waitFor(() => document.querySelector(".probe"));

    expect(getComputedStyle(text).fill).toBe(resolvedColour("--vpg-ink"));
  });

  it("draws light-mode and dark-mode ink differently", () => {
    const inkIn = (colorMode: "light" | "dark") => {
      render(
        <ThemeProvider colorMode={colorMode}>
          <ThemedChartContainer height={100}>
            <LineChart data={[]} />
          </ThemedChartContainer>
        </ThemeProvider>,
      );
      const colour = getComputedStyle(document.querySelector(".vpg-chart-container") as HTMLElement).color;
      cleanup();
      return colour;
    };

    expect(inkIn("light")).not.toBe(inkIn("dark"));
  });
});
