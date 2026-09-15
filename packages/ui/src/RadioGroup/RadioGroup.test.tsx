import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RadioButton } from "../RadioButton/RadioButton.js";
import { RadioGroup } from "./RadioGroup.js";

describe("RadioGroup", () => {
  it("renders role=radiogroup with a working aria-label", () => {
    render(
      <RadioGroup aria-label="Size">
        <RadioButton aria-label="Small" value="small" />
      </RadioGroup>,
    );
    expect(screen.getByRole("radiogroup", { name: "Size" })).toBeInTheDocument();
  });

  it("composes a caller-supplied className alongside its own classes", () => {
    render(
      <RadioGroup aria-label="Size" className="custom">
        <RadioButton aria-label="Small" value="small" />
      </RadioGroup>,
    );
    const group = screen.getByRole("radiogroup");
    expect(group).toHaveClass("custom");
    expect(group).toHaveClass("tandiko-radio-group");
  });

  it("forwards arbitrary attributes to its wrapper", () => {
    render(
      <RadioGroup aria-label="Size" data-testid="target">
        <RadioButton aria-label="Small" value="small" />
      </RadioGroup>,
    );
    expect(screen.getByTestId("target")).toBeInTheDocument();
  });

  it("never assigns a --tandiko-* custom property inline", () => {
    render(
      <RadioGroup aria-label="Size">
        <RadioButton aria-label="Small" value="small" />
      </RadioGroup>,
    );
    expect(screen.getByRole("radiogroup").getAttribute("style")).toBeNull();
  });

  describe("stylesheet", () => {
    it("injects its stylesheet once for any number of groups", () => {
      render(
        <>
          <RadioGroup aria-label="First">
            <RadioButton aria-label="A" value="a" />
          </RadioGroup>
          <RadioGroup aria-label="Second">
            <RadioButton aria-label="B" value="b" />
          </RadioGroup>
        </>,
      );

      const styles = document.head.querySelectorAll('style[data-href="tandiko-radio-group"]');
      expect(styles).toHaveLength(1);
      expect(styles[0]?.textContent).toContain(".tandiko-radio-group {");
    });
  });
});
