import { render } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";
import { AspectRatio } from "./AspectRatio.js";

const RATIO = "--vpg-aspect-ratio-ratio";

function renderBox(props: Parameters<typeof AspectRatio>[0] = {}) {
  const { container } = render(<AspectRatio {...props} />);
  const box = container.querySelector<HTMLElement>(".vpg-aspect-ratio");
  if (!box) throw new Error("AspectRatio did not render a .vpg-aspect-ratio element");
  return box;
}

describe("AspectRatio", () => {
  it("renders a div with the vpg-aspect-ratio class", () => {
    const box = renderBox();
    expect(box.tagName).toBe("DIV");
    expect(box).toHaveClass("vpg-aspect-ratio");
  });

  it("renders its children", () => {
    const { getByText } = render(
      <AspectRatio>
        <span>media</span>
      </AspectRatio>,
    );
    expect(getByText("media")).toBeInTheDocument();
  });

  describe("ratio", () => {
    it("defaults to 1", () => {
      expect(renderBox().style.getPropertyValue(RATIO)).toBe("1");
    });

    it.each([16 / 9, 4 / 3, 0.5, 2])("writes %s as its string form", (ratio) => {
      expect(renderBox({ ratio }).style.getPropertyValue(RATIO)).toBe(String(ratio));
    });

    it.each([0, -1, -16 / 9, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])("resolves %s to 1", (ratio) => {
      expect(renderBox({ ratio }).style.getPropertyValue(RATIO)).toBe("1");
    });
  });

  describe("className", () => {
    it("keeps vpg-aspect-ratio alongside the caller's class", () => {
      expect(renderBox({ className: "caller" })).toHaveClass("vpg-aspect-ratio", "caller");
    });
  });

  describe("style", () => {
    it("lets a caller's style override the ratio custom property", () => {
      const box = renderBox({ ratio: 2, style: { "--vpg-aspect-ratio-ratio": "3" } as never });
      expect(box.style.getPropertyValue(RATIO)).toBe("3");
    });

    it("keeps the ratio when a caller's style sets an ordinary property", () => {
      const box = renderBox({ ratio: 2, style: { color: "red" } });
      expect(box.style.color).toBe("red");
      expect(box.style.getPropertyValue(RATIO)).toBe("2");
    });
  });

  describe("as", () => {
    it("renders the given element", () => {
      const { container } = render(
        <AspectRatio as="figure" ratio={2}>
          <img alt="" src="x.png" />
        </AspectRatio>,
      );
      const figure = container.querySelector("figure");
      expect(figure).toHaveClass("vpg-aspect-ratio");
      expect(figure?.style.getPropertyValue(RATIO)).toBe("2");
    });
  });

  describe("ref", () => {
    it("reaches the rendered element", () => {
      const ref = createRef<HTMLDivElement>();
      const { container } = render(<AspectRatio ref={ref} />);
      expect(ref.current).toBe(container.querySelector(".vpg-aspect-ratio"));
    });
  });

  describe("stylesheet", () => {
    it("is keyed by href and precedence", () => {
      render(
        <>
          <AspectRatio />
          <AspectRatio />
        </>,
      );
      const sheets = document.querySelectorAll("style[data-href='vpg-aspect-ratio']");
      expect(sheets).toHaveLength(1);
      expect(sheets[0]).toHaveAttribute("data-precedence", "vpg-aspect-ratio");
    });
  });

  it("forwards other attributes to the element", () => {
    const box = renderBox({ id: "box-id" });
    expect(box).toHaveAttribute("id", "box-id");
  });
});
