import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Slider } from "./Slider.js";

describe("Slider", () => {
  it("renders as a native range input", () => {
    render(<Slider aria-label="Volume" />);
    expect(screen.getByRole("slider", { name: "Volume" })).toBeInTheDocument();
  });

  it("forwards min/max/step and defaultValue", () => {
    render(<Slider aria-label="Volume" min={0} max={10} step={2} defaultValue={4} />);
    const slider = screen.getByRole("slider", { name: "Volume" }) as HTMLInputElement;
    expect(slider.min).toBe("0");
    expect(slider.max).toBe("10");
    expect(slider.step).toBe("2");
    expect(slider.value).toBe("4");
  });

  it("calls onChange with the new value", () => {
    const handleChange = vi.fn();
    render(<Slider aria-label="Volume" defaultValue={3} onChange={handleChange} />);
    const slider = screen.getByRole("slider", { name: "Volume" });
    fireEvent.change(slider, { target: { value: "7" } });
    expect(handleChange).toHaveBeenCalledTimes(1);
    expect((slider as HTMLInputElement).value).toBe("7");
  });

  it("supports disabled", () => {
    render(<Slider aria-label="Volume" disabled />);
    expect(screen.getByRole("slider", { name: "Volume" })).toBeDisabled();
  });

  it("composes a caller-supplied className alongside its own classes", () => {
    render(<Slider aria-label="Volume" className="custom" />);
    const slider = screen.getByRole("slider", { name: "Volume" });
    expect(slider).toHaveClass("custom");
    expect(slider).toHaveClass("vpg-slider");
  });

  it("forwards arbitrary attributes to the input", () => {
    render(<Slider aria-label="Volume" data-testid="target" />);
    expect(screen.getByTestId("target")).toBeInTheDocument();
  });

  describe("stylesheet", () => {
    it("injects its stylesheet once for any number of sliders", () => {
      render(
        <>
          <Slider aria-label="First" />
          <Slider aria-label="Second" />
        </>,
      );

      // React hoists the style into `<head>` and rewrites `href`/`precedence` to
      // `data-href`/`data-precedence`, keyed on `href` for de-duplication.
      const styles = document.head.querySelectorAll('style[data-href="vpg-slider"]');
      expect(styles).toHaveLength(1);
      expect(styles[0]?.textContent).toContain(".vpg-slider {");
    });

    it("never assigns a --vpg-* custom property inline", () => {
      render(<Slider aria-label="Volume" className="custom" />);
      // An inline custom property would beat the stylesheet's dark-mode reassignment on the
      // same element, so this instance would stop adapting to colour mode entirely.
      expect(screen.getByRole("slider", { name: "Volume" }).getAttribute("style")).toBeNull();
    });
  });
});
