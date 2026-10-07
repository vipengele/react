import { render } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";
import { ThemedChartContainer, type ThemedChartContainerProps } from "./ThemedChartContainer.js";
import { themedChartContainerStylesheet } from "./ThemedChartContainer.stylesheet.js";

/**
 * jsdom lays nothing out, so the container measures itself as zero-sized and Recharts withholds
 * its children; whether a chart renders inside it, and at what size, is the browser suite's.
 * Here only the element Recharts renders and what the wrapper puts on it are observable.
 */
function renderContainer(props: Partial<ThemedChartContainerProps> = {}) {
  const { container } = render(
    <ThemedChartContainer height={300} {...props}>
      <span>chart</span>
    </ThemedChartContainer>,
  );
  const element = container.querySelector<HTMLElement>(".vpg-chart-container");
  if (!element) throw new Error("ThemedChartContainer did not render a .vpg-chart-container element");
  return element;
}

describe("ThemedChartContainer", () => {
  it("renders Recharts' responsive container carrying the vpg-chart-container class", () => {
    const element = renderContainer();
    expect(element.tagName).toBe("DIV");
    expect(element).toHaveClass("vpg-chart-container", "recharts-responsive-container");
  });

  it("fills its parent's width when no width is given", () => {
    expect(renderContainer().style.width).toBe("100%");
  });

  it("writes a percentage width and a pixel height onto the container", () => {
    const element = renderContainer({ width: "50%", height: 240 });
    expect(element.style.width).toBe("50%");
    expect(element.style.height).toBe("240px");
  });

  it("renders a container element when both dimensions are percentages", () => {
    expect(renderContainer({ width: "100%", height: "100%" }).style.height).toBe("100%");
  });

  describe("className", () => {
    it("keeps vpg-chart-container alongside the caller's class", () => {
      expect(renderContainer({ className: "caller" })).toHaveClass("vpg-chart-container", "caller");
    });
  });

  describe("ref", () => {
    it("reaches the container's element", () => {
      const ref = createRef<HTMLDivElement>();
      const element = renderContainer({ ref });
      expect(ref.current).toBe(element);
    });
  });

  it("forwards other attributes to the container's element", () => {
    const element = renderContainer({ id: "revenue", "aria-label": "Revenue" } as Partial<ThemedChartContainerProps>);
    expect(element).toHaveAttribute("id", "revenue");
    expect(element).toHaveAttribute("aria-label", "Revenue");
  });

  describe("stylesheet", () => {
    it("is keyed by href and precedence, once however many containers render", () => {
      render(
        <>
          <ThemedChartContainer height={100}>
            <span>one</span>
          </ThemedChartContainer>
          <ThemedChartContainer height={100}>
            <span>two</span>
          </ThemedChartContainer>
        </>,
      );
      const sheets = document.querySelectorAll("style[data-href='vpg-chart-container']");
      expect(sheets).toHaveLength(1);
      expect(sheets[0]).toHaveAttribute("data-precedence", "vpg-chart-container");
      expect(sheets[0]?.textContent).toBe(themedChartContainerStylesheet);
    });

    it("reads its colours from the ink and border tokens", () => {
      expect(themedChartContainerStylesheet).toContain("color: var(--vpg-ink);");
      expect(themedChartContainerStylesheet).toContain("outline: 1px solid var(--vpg-border);");
    });
  });
});
