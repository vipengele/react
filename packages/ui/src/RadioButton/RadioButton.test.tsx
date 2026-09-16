import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { RadioGroup } from "../RadioGroup/RadioGroup.js";
import { RadioButton } from "./RadioButton.js";

describe("RadioButton", () => {
  it("renders a native radio input", () => {
    render(<RadioButton aria-label="Small" value="small" />);
    expect(screen.getByRole("radio", { name: "Small" })).toBeInTheDocument();
  });

  it("composes a caller-supplied className alongside its own classes", () => {
    render(<RadioButton aria-label="Small" value="small" className="custom" />);
    const radio = screen.getByRole("radio", { name: "Small" });
    expect(radio).toHaveClass("custom");
    expect(radio).toHaveClass("tandiko-radio-button");
  });

  it("forwards arbitrary attributes to the input", () => {
    render(<RadioButton aria-label="Small" value="small" data-testid="target" />);
    expect(screen.getByTestId("target")).toBeInTheDocument();
  });

  it("never assigns a --tandiko-* custom property inline", () => {
    render(<RadioButton aria-label="Small" value="small" />);
    expect(
      screen.getByRole("radio", { name: "Small" }).getAttribute("style"),
    ).toBeNull();
  });

  describe("standalone, outside any RadioGroup", () => {
    it("does not throw", () => {
      expect(() => render(<RadioButton aria-label="Small" value="small" />)).not.toThrow();
    });

    it("works fully manually, controlled by its own checked/onChange props", () => {
      function ManualRadio() {
        const [checked, setChecked] = useState(false);
        return (
          <RadioButton
            aria-label="Small"
            name="size"
            value="small"
            checked={checked}
            onChange={(event) => setChecked(event.target.checked)}
          />
        );
      }
      render(<ManualRadio />);
      const radio = screen.getByRole("radio", { name: "Small" });
      expect(radio).not.toBeChecked();
      fireEvent.click(radio);
      expect(radio).toBeChecked();
    });

    it("supports the uncontrolled defaultChecked prop", () => {
      render(<RadioButton aria-label="Small" name="size" value="small" defaultChecked />);
      expect(screen.getByRole("radio", { name: "Small" })).toBeChecked();
    });

    it("uses an explicit name when given, with no group to fall back to", () => {
      render(<RadioButton aria-label="Small" name="size" value="small" />);
      expect(screen.getByRole("radio", { name: "Small" })).toHaveAttribute("name", "size");
    });
  });

  describe("stylesheet", () => {
    it("injects its stylesheet once for any number of radio buttons", () => {
      render(
        <>
          <RadioButton aria-label="First" value="one" />
          <RadioButton aria-label="Second" value="two" />
        </>,
      );

      const styles = document.head.querySelectorAll('style[data-href="tandiko-radio-button"]');
      expect(styles).toHaveLength(1);
      expect(styles[0]?.textContent).toContain(".tandiko-radio-button {");
    });
  });

  describe("inside a RadioGroup", () => {
    function renderGroup(props: Partial<React.ComponentProps<typeof RadioGroup>> = {}) {
      return render(
        <RadioGroup aria-label="Size" {...props}>
          <RadioButton aria-label="Small" value="small" />
          <RadioButton aria-label="Medium" value="medium" />
          <RadioButton aria-label="Large" value="large" />
        </RadioGroup>,
      );
    }

    it("shares one generated name across every child radio", () => {
      renderGroup();
      const small = screen.getByRole("radio", { name: "Small" });
      const medium = screen.getByRole("radio", { name: "Medium" });
      const large = screen.getByRole("radio", { name: "Large" });
      const name = small.getAttribute("name");
      expect(name).toBeTruthy();
      expect(medium).toHaveAttribute("name", name);
      expect(large).toHaveAttribute("name", name);
    });

    it("uses an explicit name over the auto-generated one", () => {
      renderGroup({ name: "size" });
      expect(screen.getByRole("radio", { name: "Small" })).toHaveAttribute("name", "size");
    });

    it("checks only the RadioButton matching the group's value", () => {
      renderGroup({ defaultValue: "medium" });
      expect(screen.getByRole("radio", { name: "Small" })).not.toBeChecked();
      expect(screen.getByRole("radio", { name: "Medium" })).toBeChecked();
      expect(screen.getByRole("radio", { name: "Large" })).not.toBeChecked();
    });

    it("selects only one radio at a time when clicked, uncontrolled", () => {
      renderGroup();
      fireEvent.click(screen.getByRole("radio", { name: "Medium" }));
      expect(screen.getByRole("radio", { name: "Medium" })).toBeChecked();
      expect(screen.getByRole("radio", { name: "Small" })).not.toBeChecked();

      fireEvent.click(screen.getByRole("radio", { name: "Large" }));
      expect(screen.getByRole("radio", { name: "Large" })).toBeChecked();
      expect(screen.getByRole("radio", { name: "Medium" })).not.toBeChecked();
    });

    it("fires onChange with the clicked value while uncontrolled", () => {
      const onChange = vi.fn();
      renderGroup({ onChange });
      fireEvent.click(screen.getByRole("radio", { name: "Large" }));
      expect(onChange).toHaveBeenCalledWith("large");
    });

    it("leaves selection to the consumer when controlled", () => {
      const onChange = vi.fn();
      const { rerender } = render(
        <RadioGroup aria-label="Size" value="small" onChange={onChange}>
          <RadioButton aria-label="Small" value="small" />
          <RadioButton aria-label="Medium" value="medium" />
        </RadioGroup>,
      );

      fireEvent.click(screen.getByRole("radio", { name: "Medium" }));
      expect(onChange).toHaveBeenCalledWith("medium");
      expect(screen.getByRole("radio", { name: "Small" })).toBeChecked();
      expect(screen.getByRole("radio", { name: "Medium" })).not.toBeChecked();

      rerender(
        <RadioGroup aria-label="Size" value="medium" onChange={onChange}>
          <RadioButton aria-label="Small" value="small" />
          <RadioButton aria-label="Medium" value="medium" />
        </RadioGroup>,
      );
      expect(screen.getByRole("radio", { name: "Medium" })).toBeChecked();
    });

    it("calls a RadioButton's own onChange as well as updating the group", () => {
      const onChange = vi.fn();
      render(
        <RadioGroup aria-label="Size">
          <RadioButton aria-label="Small" value="small" onChange={onChange} />
          <RadioButton aria-label="Medium" value="medium" />
        </RadioGroup>,
      );
      fireEvent.click(screen.getByRole("radio", { name: "Small" }));
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(screen.getByRole("radio", { name: "Small" })).toBeChecked();
    });

    it("lets an explicit checked prop override the group's own state", () => {
      renderGroup({ defaultValue: "small" });
      render(
        <RadioGroup aria-label="Other">
          <RadioButton aria-label="Manual" value="manual" name="manual" checked={false} />
        </RadioGroup>,
      );
      expect(screen.getByRole("radio", { name: "Manual" })).not.toBeChecked();
    });

    it("does not update the group's own state when checked is set manually inside one", () => {
      const onChange = vi.fn();
      const onGroupChange = vi.fn();
      render(
        <RadioGroup aria-label="Size" onChange={onGroupChange}>
          <RadioButton aria-label="Manual" value="small" checked={false} onChange={onChange} />
        </RadioGroup>,
      );
      fireEvent.click(screen.getByRole("radio", { name: "Manual" }));
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onGroupChange).not.toHaveBeenCalled();
    });

    it("does not throw when a grouped RadioButton with no value is clicked", () => {
      const onGroupChange = vi.fn();
      render(
        <RadioGroup aria-label="Size" onChange={onGroupChange}>
          <RadioButton aria-label="Valueless" />
        </RadioGroup>,
      );
      expect(() => fireEvent.click(screen.getByRole("radio", { name: "Valueless" }))).not.toThrow();
      expect(onGroupChange).not.toHaveBeenCalled();
    });

    it("does not render a valueless RadioButton as checked when the group has no selection", () => {
      render(
        <RadioGroup aria-label="Size">
          <RadioButton aria-label="Valueless" />
        </RadioGroup>,
      );
      expect(screen.getByRole("radio", { name: "Valueless" })).not.toBeChecked();
    });
  });
});
