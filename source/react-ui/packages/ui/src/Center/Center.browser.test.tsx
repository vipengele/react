import { ThemeProvider } from "@vipengele/react-tokens";
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { Center } from "./Center.js";

/**
 * The cap and the inset reach the stylesheet as `var()` reads of `--vpg-center-*` properties,
 * which jsdom neither resolves nor lays out, so the only place the width, the centring and the
 * padding can be observed is a real engine. Each centre sits in a fixed-width parent wider than
 * every width step, so its geometry does not depend on the viewport the test runs in.
 */

// The chromium project has no setup file, so nothing auto-cleans between tests; without this each
// render collides with the previous one and `getByTestId` matches more than one element.
afterEach(cleanup);

const PARENT_WIDTH = 2000;

/** Mounts `children` under a real provider, inside a parent wider than the widest width step. */
function renderThemed(children: ReactNode) {
  return render(
    <ThemeProvider>
      <div data-testid="parent" style={{ inlineSize: `${PARENT_WIDTH}px` }}>
        {children}
      </div>
    </ThemeProvider>,
  );
}

/**
 * Resolves a length token to the pixels the engine computes for it inside the mounted root. A
 * read-back of the custom property returns its unresolved text, so the token is consumed as a
 * real property on a probe instead.
 */
function resolvedLength(token: string): number {
  const probe = document.createElement("div");
  probe.style.inlineSize = `var(${token})`;
  (document.querySelector(".vpg-root") as HTMLElement).append(probe);
  const pixels = Number.parseFloat(getComputedStyle(probe).inlineSize);
  probe.remove();
  return pixels;
}

function rect(testId: string): DOMRect {
  return screen.getByTestId(testId).getBoundingClientRect();
}

describe("Center under a real ThemeProvider", () => {
  describe("max", () => {
    it.each(["sm", "md", "lg", "xl"] as const)("caps the outer width at the resolved %s width step", (max) => {
      renderThemed(<Center data-testid="center" max={max} />);

      const width = resolvedLength(`--vpg-width-${max}`);
      expect(width).toBeGreaterThan(0);
      expect(width).toBeLessThan(PARENT_WIDTH);
      expect(rect("center").width).toBeCloseTo(width, 1);
    });

    it("keeps the outer width at the step whatever the inset", () => {
      renderThemed(
        <>
          <Center data-testid="none" max="md" inset="none" />
          <Center data-testid="wide" max="md" inset="space-8" />
        </>,
      );

      expect(rect("wide").width).toBeCloseTo(rect("none").width, 1);
      expect(rect("wide").left).toBeCloseTo(rect("none").left, 1);
    });

    it("fills a container narrower than the step", () => {
      render(
        <ThemeProvider>
          <div data-testid="narrow" style={{ inlineSize: "300px" }}>
            <Center data-testid="center" max="sm" />
          </div>
        </ThemeProvider>,
      );

      expect(rect("center").width).toBeCloseTo(300, 1);
    });
  });

  it("centres a box narrower than its container with equal margins", () => {
    renderThemed(<Center data-testid="center" max="sm" />);

    const parent = rect("parent");
    const center = rect("center");
    expect(center.width).toBeLessThan(parent.width);
    expect(center.left - parent.left).toBeGreaterThan(0);
    expect(center.left - parent.left).toBeCloseTo(parent.right - center.right, 1);
  });

  describe("inset", () => {
    it.each(["space-2", "space-8"] as const)("pads the content off both inline edges by the resolved %s step", (inset) => {
      renderThemed(
        <Center data-testid="center" inset={inset}>
          <div data-testid="child" style={{ blockSize: "20px" }} />
        </Center>,
      );

      const pad = resolvedLength(`--vpg-${inset}`);
      const center = rect("center");
      const child = rect("child");
      expect(pad).toBeGreaterThan(0);
      expect(child.left - center.left).toBeCloseTo(pad, 1);
      expect(center.right - child.right).toBeCloseTo(pad, 1);
    });

    it("lets the content reach both edges when the inset is none", () => {
      renderThemed(
        <Center data-testid="center" inset="none">
          <div data-testid="child" style={{ blockSize: "20px" }} />
        </Center>,
      );

      expect(rect("child").left).toBeCloseTo(rect("center").left, 1);
      expect(rect("child").width).toBeCloseTo(rect("center").width, 1);
    });
  });

  describe("intrinsic", () => {
    it("centres a narrow child at its own width inside the capped box", () => {
      renderThemed(
        <Center data-testid="center" max="sm" intrinsic>
          <div data-testid="child" style={{ inlineSize: "100px", blockSize: "20px" }} />
        </Center>,
      );

      const center = rect("center");
      const child = rect("child");
      expect(center.width).toBeCloseTo(resolvedLength("--vpg-width-sm"), 1);
      expect(child.width).toBeCloseTo(100, 1);
      expect(child.left - center.left).toBeCloseTo(center.right - child.right, 1);
    });

    it("sizes an auto-width child to its content rather than stretching it", () => {
      renderThemed(
        <Center data-testid="center" intrinsic>
          <span data-testid="child">Short</span>
        </Center>,
      );

      const center = rect("center");
      const child = rect("child");
      expect(child.width).toBeGreaterThan(0);
      expect(child.width).toBeLessThan(center.width / 2);
      expect(child.left - center.left).toBeCloseTo(center.right - child.right, 1);
    });

    it("stretches an auto-width child across the content box without it", () => {
      renderThemed(
        <Center data-testid="center" inset="none">
          <div data-testid="child">Short</div>
        </Center>,
      );

      expect(rect("child").width).toBeCloseTo(rect("center").width, 1);
    });
  });
});
