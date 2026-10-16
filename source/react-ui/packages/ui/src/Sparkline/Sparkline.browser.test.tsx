import { ThemeProvider } from "@vipengele/react-tokens";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { SparklineProps, SparklineTone } from "./Sparkline.js";
import { Sparkline } from "./Sparkline.js";

/**
 * The svg stretches a 100 by 100 viewBox to the box with `preserveAspectRatio="none"`, while the
 * end dot is an html element placed by percentage, and each tone reads a `--vpg-*` colour through
 * `currentColor`. jsdom lays nothing out and resolves no custom property, so only a real engine
 * shows whether the dot lands on the end of the stretched line, stays round, and takes its colour
 * from the theme.
 */

// The chromium project has no setup file, so nothing auto-cleans between tests the way the
// jsdom project's does; without this every render after the first collides with the previous one.
afterEach(cleanup);

/** How far apart, in px, two screen positions may be and still count as the same point. */
const TOLERANCE = 0.5;

/** Resolves a token to the value the engine computes for `color` inside the mounted root. */
function resolved(token: string): string {
  const probe = document.createElement("span");
  probe.style.color = `var(${token})`;
  (document.querySelector(".vpg-root") as HTMLElement).append(probe);
  const value = getComputedStyle(probe).color;
  probe.remove();
  return value;
}

function mount(props: SparklineProps, width: number, colorMode: "light" | "dark" = "light") {
  const { container } = render(
    <ThemeProvider colorMode={colorMode}>
      <div data-testid="parent" style={{ width }}>
        <Sparkline {...props} />
      </div>
    </ThemeProvider>,
  );
  const parent = container.querySelector('[data-testid="parent"]') as HTMLElement;
  const root = container.querySelector(".vpg-sparkline") as HTMLElement;
  const svg = container.querySelector(".vpg-sparkline-svg") as SVGSVGElement;
  return { parent, root, svg };
}

/** The screen position of the end of the last line path, through the svg's own stretch. */
function lineEnd(svg: SVGSVGElement): { x: number; y: number } {
  const paths = svg.querySelectorAll<SVGPathElement>(".vpg-sparkline-line");
  const path = paths[paths.length - 1] as SVGPathElement;
  const end = path.getPointAtLength(path.getTotalLength());
  const screen = new DOMPoint(end.x, end.y).matrixTransform(svg.getScreenCTM() as DOMMatrix);
  return { x: screen.x, y: screen.y };
}

function centreOf(element: Element): { x: number; y: number } {
  const box = element.getBoundingClientRect();
  return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
}

function endDot(root: HTMLElement): HTMLElement {
  return root.querySelector(".vpg-sparkline-dot-end") as HTMLElement;
}

function expectDotOnLineEnd(root: HTMLElement, svg: SVGSVGElement) {
  const dot = centreOf(endDot(root));
  const end = lineEnd(svg);
  expect(Math.abs(dot.x - end.x)).toBeLessThanOrEqual(TOLERANCE);
  expect(Math.abs(dot.y - end.y)).toBeLessThanOrEqual(TOLERANCE);
}

describe("a Sparkline's box", () => {
  it("fills its parent's width at the default 32px height, across a resize", () => {
    const { parent, root, svg } = mount({ values: [12, 31, 20] }, 120);
    expect(root.getBoundingClientRect().width).toBeCloseTo(120, 1);
    expect(svg.getBoundingClientRect().width).toBeCloseTo(120, 1);
    expect(svg.getBoundingClientRect().height).toBeCloseTo(32, 1);
    expect(root.getBoundingClientRect().height).toBeCloseTo(32, 1);

    parent.style.width = "300px";
    expect(root.getBoundingClientRect().width).toBeCloseTo(300, 1);
    expect(svg.getBoundingClientRect().width).toBeCloseTo(300, 1);
    expect(svg.getBoundingClientRect().height).toBeCloseTo(32, 1);
    expect(root.getBoundingClientRect().height).toBeCloseTo(32, 1);
  });

  it("keeps a custom height across a resize", () => {
    const { parent, root, svg } = mount({ values: [12, 31, 20], height: 48 }, 120);
    expect(svg.getBoundingClientRect().height).toBeCloseTo(48, 1);
    expect(root.getBoundingClientRect().height).toBeCloseTo(48, 1);

    parent.style.width = "300px";
    expect(svg.getBoundingClientRect().width).toBeCloseTo(300, 1);
    expect(svg.getBoundingClientRect().height).toBeCloseTo(48, 1);
    expect(root.getBoundingClientRect().height).toBeCloseTo(48, 1);
  });
});

describe("a Sparkline's end dot", () => {
  it.each([
    { values: [12, 31, 20], height: undefined },
    { values: [12, 31, 20], height: 48 },
    { values: [5, 1, 8, 2, null], height: 20 },
    { values: [1, 2, null], height: 64 },
  ])("sits on the end of the line for $values at height $height, across a resize", ({ values, height }) => {
    const { parent, root, svg } = mount({ values, height }, 120);
    expectDotOnLineEnd(root, svg);

    parent.style.width = "300px";
    expectDotOnLineEnd(root, svg);
  });

  it("stays round however far the box stretches", () => {
    const { parent, root } = mount({ values: [12, 31, 20], height: 48 }, 120);
    for (const width of [120, 300, 40]) {
      parent.style.width = `${width}px`;
      const box = endDot(root).getBoundingClientRect();
      expect(box.width).toBeCloseTo(6, 1);
      expect(box.height).toBeCloseTo(box.width, 1);
    }
  });

  it("keeps an isolated point's dot round and centred on its slot", () => {
    const { root, svg } = mount({ values: [1, 2, null, 3, null, 4, 5], height: 40 }, 300);
    const dot = root.querySelector(".vpg-sparkline-dot:not(.vpg-sparkline-dot-end)") as HTMLElement;
    const box = dot.getBoundingClientRect();
    expect(box.width).toBeCloseTo(4, 1);
    expect(box.height).toBeCloseTo(box.width, 1);
    // Index 3 of 7 sits at the horizontal centre, and the value 3 halfway up the 1..5 range.
    const svgBox = svg.getBoundingClientRect();
    const centre = centreOf(dot);
    expect(Math.abs(centre.x - (svgBox.left + svgBox.width / 2))).toBeLessThanOrEqual(TOLERANCE);
    expect(Math.abs(centre.y - (svgBox.top + svgBox.height / 2))).toBeLessThanOrEqual(TOLERANCE);
  });
});

describe("a Sparkline's line", () => {
  it("keeps a 1.5px stroke that does not scale with the stretch", () => {
    const { svg } = mount({ values: [12, 31, 20], height: 48 }, 300);
    const style = getComputedStyle(svg.querySelector(".vpg-sparkline-line") as SVGPathElement);
    expect(style.strokeWidth).toBe("1.5px");
    expect(style.vectorEffect).toBe("non-scaling-stroke");
  });
});

describe("a Sparkline's colour under a real ThemeProvider", () => {
  const cases: { tone: SparklineTone | undefined; token: string }[] = [
    { tone: undefined, token: "--vpg-ink-muted" },
    { tone: "success", token: "--vpg-success" },
    { tone: "danger", token: "--vpg-danger" },
  ];

  it.each(cases)("draws the $tone tone in $token in both colour modes", ({ tone, token }) => {
    for (const colorMode of ["light", "dark"] as const) {
      const { root, svg } = mount({ values: [12, 31, 20], tone }, 200, colorMode);
      const expected = resolved(token);
      const color = getComputedStyle(root).color;
      const stroke = getComputedStyle(svg.querySelector(".vpg-sparkline-line") as SVGPathElement).stroke;
      const fill = getComputedStyle(svg.querySelector(".vpg-sparkline-area") as SVGPathElement).fill;
      const dot = getComputedStyle(endDot(root)).backgroundColor;
      cleanup();

      // An unresolved read serialises the token text; a tone rule that never matched leaves the
      // inherited ink rather than the tone's colour.
      expect(color).not.toMatch(/var\(|--vpg-/);
      expect(color).toBe(expected);
      expect(stroke).toBe(expected);
      expect(fill).toBe(expected);
      expect(dot).toBe(expected);
    }
  });
});
