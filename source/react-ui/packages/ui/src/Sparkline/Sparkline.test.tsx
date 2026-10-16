import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { SparklineTone } from "./Sparkline.js";
import { Sparkline } from "./Sparkline.js";

const TONES: SparklineTone[] = ["neutral", "success", "warning", "info", "danger"];

function lines(container: HTMLElement) {
  return container.querySelectorAll(".vpg-sparkline-line");
}

function areas(container: HTMLElement) {
  return container.querySelectorAll(".vpg-sparkline-area");
}

/** Dots that mark a point isolated between gaps, excluding the end dot. */
function isolatedDots(container: HTMLElement) {
  return container.querySelectorAll(".vpg-sparkline-dot:not(.vpg-sparkline-dot-end)");
}

function endDots(container: HTMLElement) {
  return container.querySelectorAll<HTMLElement>(".vpg-sparkline-dot-end");
}

describe("Sparkline", () => {
  describe("accessibility", () => {
    it("renders an image whose drawing is hidden from assistive technology", () => {
      const { container } = render(<Sparkline values={[12, 31]} />);
      const image = screen.getByRole("img");
      expect(image.tagName).toBe("DIV");
      expect(image).toHaveClass("vpg-sparkline");
      const svg = container.querySelector("svg") as SVGSVGElement;
      expect(svg).toHaveAttribute("aria-hidden", "true");
      expect(svg).toHaveAttribute("focusable", "false");
    });

    it.each([
      { values: [12, 20, 31], name: "Trend: rising, from 12 to 31" },
      { values: [31, 20, 12], name: "Trend: falling, from 31 to 12" },
      { values: [12, 40, 12], name: "Trend: flat, from 12 to 12" },
      { values: [], name: "No data" },
      { values: [null, undefined, Number.NaN], name: "No data" },
      { values: [null, 12, null], name: "Trend: flat, at 12" },
    ])("names $values as '$name'", ({ values, name }) => {
      render(<Sparkline values={values} />);
      expect(screen.getByRole("img")).toHaveAccessibleName(name);
    });

    it("prefixes the generated trend text with the label", () => {
      render(<Sparkline values={[12, 31]} label="Revenue" />);
      expect(screen.getByRole("img")).toHaveAccessibleName("Revenue. Trend: rising, from 12 to 31");
    });

    it("prefixes No data with the label for a series with nothing present", () => {
      render(<Sparkline values={[]} label="Revenue" />);
      expect(screen.getByRole("img")).toHaveAccessibleName("Revenue. No data");
    });

    it("uses the summary as the whole name, in place of the label and the trend text", () => {
      render(<Sparkline values={[12, 31]} label="Revenue" summary="Revenue up 158% this quarter" />);
      expect(screen.getByRole("img")).toHaveAccessibleName("Revenue up 158% this quarter");
    });

    it("carries no role and no name, and hides itself, when decorative", () => {
      const { container } = render(<Sparkline values={[12, 31]} label="Revenue" decorative />);
      expect(screen.queryByRole("img")).toBeNull();
      const root = container.querySelector(".vpg-sparkline") as HTMLElement;
      expect(root).not.toHaveAttribute("role");
      expect(root).not.toHaveAttribute("aria-label");
      expect(root).toHaveAttribute("aria-hidden", "true");
    });

    it("formats the numbers in the trend text for the locale", () => {
      render(<Sparkline values={[1234, 5678]} locale="de-DE" />);
      expect(screen.getByRole("img")).toHaveAccessibleName("Trend: rising, from 1.234 to 5.678");
    });
  });

  describe("the root element", () => {
    it("defaults to the neutral tone", () => {
      render(<Sparkline values={[1, 2]} />);
      expect(screen.getByRole("img")).toHaveClass("vpg-sparkline-neutral");
    });

    it.each(TONES)("carries the %s tone class", (tone) => {
      render(<Sparkline values={[1, 2]} tone={tone} />);
      const root = screen.getByRole("img");
      expect(root).toHaveClass(`vpg-sparkline-${tone}`);
      for (const other of TONES.filter((t) => t !== tone)) expect(root).not.toHaveClass(`vpg-sparkline-${other}`);
    });

    it("composes className and forwards its ref and other props to the root", () => {
      const ref = createRef<HTMLDivElement>();
      render(<Sparkline values={[1, 2]} className="custom" id="trend" data-testid="spark" ref={ref} />);
      const root = screen.getByTestId("spark");
      expect(root).toHaveClass("vpg-sparkline", "vpg-sparkline-neutral", "custom");
      expect(root).toHaveAttribute("id", "trend");
      expect(ref.current).toBe(root);
    });

    it("never assigns a --vpg-* custom property inline", () => {
      render(<Sparkline values={[1, 2]} tone="danger" />);
      // An inline custom property would beat the base stylesheet's colour-mode reassignment on
      // the same element, so the sparkline would stop adapting to colour mode.
      expect(screen.getByRole("img").getAttribute("style")).toBeNull();
    });
  });

  describe("the svg", () => {
    it("fills the width at a default height of 32", () => {
      const { container } = render(<Sparkline values={[1, 2]} />);
      const svg = container.querySelector("svg") as SVGSVGElement;
      expect(svg).toHaveAttribute("width", "100%");
      expect(svg).toHaveAttribute("height", "32");
      expect(svg).toHaveAttribute("viewBox", "0 0 100 100");
      expect(svg).toHaveAttribute("preserveAspectRatio", "none");
    });

    it("takes its height from the height prop", () => {
      const { container } = render(<Sparkline values={[1, 2]} height={48} />);
      expect(container.querySelector("svg")).toHaveAttribute("height", "48");
    });
  });

  describe("gaps", () => {
    it("draws one line and one area for a series with no gaps", () => {
      const { container } = render(<Sparkline values={[12, 31, 20]} />);
      expect(lines(container)).toHaveLength(1);
      expect(areas(container)).toHaveLength(1);
      expect(lines(container)[0]).toHaveAttribute("d", "M0 90 L50 10 L100 56.32");
      expect(areas(container)[0]).toHaveAttribute("d", "M0 100 L0 90 L50 10 L100 56.32 L100 100 Z");
    });

    it("breaks the line into one path per run of present values", () => {
      const { container } = render(<Sparkline values={[1, 2, null, 3, 4]} />);
      expect([...lines(container)].map((path) => path.getAttribute("d"))).toEqual(["M0 90 L25 63.33", "M75 36.67 L100 10"]);
      expect(areas(container)).toHaveLength(2);
      expect(isolatedDots(container)).toHaveLength(0);
    });

    it("draws a value isolated between gaps as a small dot with no path", () => {
      const { container } = render(<Sparkline values={[1, 2, null, 3, null, 4, 5]} />);
      expect(lines(container)).toHaveLength(2);
      expect(areas(container)).toHaveLength(2);
      const dots = isolatedDots(container);
      expect(dots).toHaveLength(1);
      expect((dots[0] as HTMLElement).style.left).toBe("50%");
      expect((dots[0] as HTMLElement).style.top).toBe("50%");
    });

    it("draws a single present value as the end dot alone, with no path and no second dot", () => {
      const { container } = render(<Sparkline values={[null, 12, null]} />);
      expect(lines(container)).toHaveLength(0);
      expect(areas(container)).toHaveLength(0);
      expect(isolatedDots(container)).toHaveLength(0);
      const end = endDots(container);
      expect(end).toHaveLength(1);
      expect(end[0]?.style.left).toBe("50%");
      expect(end[0]?.style.top).toBe("50%");
    });

    it("places the end dot on the last present value, not the last index", () => {
      const { container } = render(<Sparkline values={[1, 2, null]} />);
      const end = endDots(container);
      expect(end).toHaveLength(1);
      expect(end[0]?.style.left).toBe("50%");
      expect(end[0]?.style.top).toBe("10%");
      expect(lines(container)[0]).toHaveAttribute("d", "M0 90 L50 10");
    });

    it("starts the line at the first present value after leading gaps", () => {
      const { container } = render(<Sparkline values={[null, null, 1, 2]} />);
      expect(lines(container)).toHaveLength(1);
      expect(lines(container)[0]).toHaveAttribute("d", "M66.67 90 L100 10");
      expect(endDots(container)[0]?.style.left).toBe("100%");
    });

    it("draws an isolated last value as the end dot only, not also as an isolated dot", () => {
      const { container } = render(<Sparkline values={[1, 2, null, 3]} />);
      expect(lines(container)).toHaveLength(1);
      expect(isolatedDots(container)).toHaveLength(0);
      expect(endDots(container)).toHaveLength(1);
      expect(endDots(container)[0]?.style.left).toBe("100%");
    });

    it.each([{ values: [] }, { values: [null, undefined, Number.NaN, Number.POSITIVE_INFINITY] }])(
      "draws no paths and no dots for $values",
      ({ values }) => {
        const { container } = render(<Sparkline values={values} />);
        expect(container.querySelectorAll("path")).toHaveLength(0);
        expect(container.querySelectorAll(".vpg-sparkline-dot")).toHaveLength(0);
      },
    );
  });

  it("injects its stylesheet once for any number of sparklines", () => {
    render(
      <>
        <Sparkline values={[1, 2]} />
        <Sparkline values={[3, 1]} tone="info" />
      </>,
    );

    // React hoists the style into `<head>` and rewrites `href`/`precedence` to
    // `data-href`/`data-precedence`, keyed on `href` for de-duplication.
    const styles = document.head.querySelectorAll('style[data-href="vpg-sparkline"]');
    expect(styles).toHaveLength(1);
    expect(styles[0]?.textContent).toContain(".vpg-sparkline {");
  });
});
