import { render } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";
import { Center, type CenterMax } from "./Center.js";

const MAX = "--vpg-center-max";
const INSET = "--vpg-center-inset";

const MAX_STEPS: readonly CenterMax[] = ["sm", "md", "lg", "xl"];

const SPACE_STEPS = ["space-1", "space-2", "space-3", "space-4", "space-5", "space-6", "space-7", "space-8"] as const;

function renderCenter(props: Parameters<typeof Center>[0] = {}) {
  const { container } = render(<Center {...props} />);
  const center = container.querySelector<HTMLElement>(".vpg-center");
  if (!center) throw new Error("Center did not render a .vpg-center element");
  return center;
}

describe("Center", () => {
  it("renders a div with the vpg-center class", () => {
    const center = renderCenter();
    expect(center.tagName).toBe("DIV");
    expect(center.className).toBe("vpg-center");
  });

  it("renders its children", () => {
    const { getByText } = render(
      <Center>
        <span>content</span>
      </Center>,
    );
    expect(getByText("content")).toBeInTheDocument();
  });

  it("injects one stylesheet keyed by href", () => {
    render(
      <>
        <Center />
        <Center />
      </>,
    );
    expect(document.querySelectorAll("style[data-href='vpg-center']")).toHaveLength(1);
  });

  describe("defaults", () => {
    it("caps at the lg width step", () => {
      expect(renderCenter().style.getPropertyValue(MAX)).toBe("var(--vpg-width-lg)");
    });

    it("insets by space-4", () => {
      expect(renderCenter().style.getPropertyValue(INSET)).toBe("var(--vpg-space-4)");
    });
  });

  describe("max", () => {
    it.each(MAX_STEPS)("maps %s to a var() read of the theme's width step", (step) => {
      expect(renderCenter({ max: step }).style.getPropertyValue(MAX)).toBe(`var(--vpg-width-${step})`);
    });
  });

  describe("inset", () => {
    it.each(SPACE_STEPS)("maps %s to a var() read of the theme step", (step) => {
      expect(renderCenter({ inset: step }).style.getPropertyValue(INSET)).toBe(`var(--vpg-${step})`);
    });

    it("maps none to 0", () => {
      expect(renderCenter({ inset: "none" }).style.getPropertyValue(INSET)).toBe("0");
    });
  });

  describe("unknown values", () => {
    it.each(["40rem", "var(--my-width)", "width-lg", "2xl", "toString", ""])("resolves max %j to the default", (max) => {
      const center = renderCenter({ max: max as never });
      expect(center.style.getPropertyValue(MAX)).toBe("var(--vpg-width-lg)");
    });

    it.each(["13px", "var(--my-inset)", "space-9", "toString", ""])("resolves inset %j to the default", (inset) => {
      const center = renderCenter({ inset: inset as never });
      expect(center.style.getPropertyValue(INSET)).toBe("var(--vpg-space-4)");
    });
  });

  describe("inline custom properties", () => {
    it.each([[{}], [{ max: "sm", inset: "none" }], [{ max: "xl", inset: "space-8", intrinsic: true }]] as const)(
      "holds a var() read or 0 for %j",
      (props) => {
        const style = renderCenter({ ...props }).style;
        expect(style.getPropertyValue(MAX)).toMatch(/^var\(--vpg-width-(sm|md|lg|xl)\)$/);
        expect(style.getPropertyValue(INSET)).toMatch(/^(var\(--vpg-space-[1-8]\)|0)$/);
      },
    );

    it("sets both on every instance, whichever props are given", () => {
      const style = renderCenter({ max: "md" }).style;
      expect(style.getPropertyValue(MAX)).not.toBe("");
      expect(style.getPropertyValue(INSET)).not.toBe("");
    });
  });

  describe("intrinsic", () => {
    it("adds the intrinsic class when set", () => {
      expect(renderCenter({ intrinsic: true })).toHaveClass("vpg-center", "vpg-center-intrinsic");
    });

    it("leaves the intrinsic class off by default and when false", () => {
      expect(renderCenter()).not.toHaveClass("vpg-center-intrinsic");
      expect(renderCenter({ intrinsic: false })).not.toHaveClass("vpg-center-intrinsic");
    });
  });

  describe("as", () => {
    it("renders the given element", () => {
      const { container } = render(
        <Center as="main">
          <p>content</p>
        </Center>,
      );
      const main = container.querySelector("main");
      expect(main).toHaveClass("vpg-center");
      expect(main?.style.getPropertyValue(MAX)).toBe("var(--vpg-width-lg)");
    });
  });

  describe("className", () => {
    it("keeps vpg-center alongside the caller's class", () => {
      expect(renderCenter({ className: "caller" }).className).toBe("vpg-center caller");
    });

    it("keeps vpg-center and the intrinsic class alongside the caller's class", () => {
      expect(renderCenter({ className: "caller", intrinsic: true }).className).toBe("vpg-center vpg-center-intrinsic caller");
    });
  });

  describe("style", () => {
    it("lets a caller's style override the max custom property", () => {
      const center = renderCenter({ max: "sm", style: { "--vpg-center-max": "50rem" } as never });
      expect(center.style.getPropertyValue(MAX)).toBe("50rem");
    });

    it("keeps the custom properties when a caller's style sets an ordinary property", () => {
      const center = renderCenter({ style: { color: "red" } });
      expect(center.style.color).toBe("red");
      expect(center.style.getPropertyValue(MAX)).toBe("var(--vpg-width-lg)");
      expect(center.style.getPropertyValue(INSET)).toBe("var(--vpg-space-4)");
    });
  });

  describe("ref", () => {
    it("reaches the rendered element", () => {
      const ref = createRef<HTMLDivElement>();
      const { container } = render(<Center ref={ref} />);
      expect(ref.current).toBe(container.querySelector(".vpg-center"));
    });
  });

  it("forwards other attributes to the element", () => {
    const center = renderCenter({ id: "center-id" } as never);
    expect(center).toHaveAttribute("id", "center-id");
  });
});
