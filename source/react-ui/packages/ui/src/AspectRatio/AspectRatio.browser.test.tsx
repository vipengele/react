import { cleanup, render } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { AspectRatio } from "./AspectRatio.js";

/**
 * The box's height comes from `aspect-ratio` reading `--vpg-aspect-ratio-ratio`, which jsdom
 * neither resolves nor lays out, so the only place the ratio, the clipping of tall content and
 * the child fill can be observed is a real engine. Nothing here reads a theme token, so no
 * provider is mounted.
 */

// The chromium project has no setup file, so nothing auto-cleans between tests the way the
// jsdom project's does; without this every render after the first sits beside the previous one
// and `.vpg-aspect-ratio` matches more than one element.
afterEach(cleanup);

const PARENT_WIDTH = 320;

/** Mounts `box` in a parent of fixed width, so the box's width and the expected height are known. */
function renderInParent(box: ReactNode) {
  const { container } = render(<div style={{ width: PARENT_WIDTH }}>{box}</div>);
  const element = container.querySelector(".vpg-aspect-ratio") as HTMLElement;
  // React 19 hoists each `<style precedence>` into the head, so the box's element children are
  // exactly the children the caller passed.
  const child = element.firstElementChild as HTMLElement | null;
  return { box: element.getBoundingClientRect(), element, child };
}

describe("AspectRatio geometry in a real engine", () => {
  it("sizes its height to its width over a 16 / 9 ratio", () => {
    const { box } = renderInParent(<AspectRatio ratio={16 / 9} />);

    expect(box.width).toBeCloseTo(PARENT_WIDTH, 1);
    expect(box.height).toBeCloseTo(PARENT_WIDTH / (16 / 9), 1);
  });

  it("holds a square when no ratio is given", () => {
    const { box } = renderInParent(<AspectRatio />);

    expect(box.width).toBeCloseTo(PARENT_WIDTH, 1);
    expect(box.height).toBeCloseTo(PARENT_WIDTH, 1);
  });

  it("keeps the ratio when a child is taller than it", () => {
    const { box, child } = renderInParent(
      <AspectRatio ratio={16 / 9}>
        <div style={{ height: PARENT_WIDTH * 4 }}>Tall</div>
      </AspectRatio>,
    );

    expect(child?.getBoundingClientRect().height).toBeCloseTo(PARENT_WIDTH * 4, 1);
    expect(box.height).toBeCloseTo(PARENT_WIDTH / (16 / 9), 1);
  });

  it("stretches a direct child to fill the box exactly", () => {
    const { box, child } = renderInParent(
      <AspectRatio ratio={16 / 9}>
        <div>Fill</div>
      </AspectRatio>,
    );
    const fill = (child as HTMLElement).getBoundingClientRect();

    expect(box.height).toBeGreaterThan(0);
    expect(fill.left).toBeCloseTo(box.left, 1);
    expect(fill.top).toBeCloseTo(box.top, 1);
    expect(fill.width).toBeCloseTo(box.width, 1);
    expect(fill.height).toBeCloseTo(box.height, 1);
  });

  it("covers the box with an img child", () => {
    const { box, child } = renderInParent(
      <AspectRatio ratio={16 / 9}>
        <img alt="" />
      </AspectRatio>,
    );
    const image = child as HTMLImageElement;
    const fill = image.getBoundingClientRect();

    expect(getComputedStyle(image).objectFit).toBe("cover");
    expect(fill.width).toBeCloseTo(box.width, 1);
    expect(fill.height).toBeCloseTo(box.height, 1);
  });
});
