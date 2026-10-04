import { Check } from "@vipengele/react-icons";
import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { SegmentedControl, type SegmentedControlOption } from "./SegmentedControl.js";

const options: SegmentedControlOption[] = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
];

describe("SegmentedControl", () => {
  describe("structure", () => {
    it("renders a radiogroup holding one labelled native radio per option", () => {
      render(<SegmentedControl aria-label="Range" options={options} />);

      const group = screen.getByRole("radiogroup", { name: "Range" });
      const segments = group.querySelectorAll("label.vpg-segmented-control-segment");
      expect(segments).toHaveLength(3);
      for (const segment of segments) {
        expect(segment.querySelector("input")).not.toBeNull();
      }
      expect(screen.getAllByRole("radio").map((radio) => (radio as HTMLInputElement).value)).toEqual(["day", "week", "month"]);
    });

    it("names the radiogroup from aria-labelledby", () => {
      render(
        <>
          <span id="range-label">Date range</span>
          <SegmentedControl aria-labelledby="range-label" options={options} />
        </>,
      );
      expect(screen.getByRole("radiogroup", { name: "Date range" })).toBeInTheDocument();
    });

    it("injects its stylesheet once for any number of controls", () => {
      render(
        <>
          <SegmentedControl aria-label="First" options={options} />
          <SegmentedControl aria-label="Second" options={options} />
        </>,
      );

      const styles = document.head.querySelectorAll('style[data-href="vpg-segmented-control"]');
      expect(styles).toHaveLength(1);
      expect(styles[0]?.textContent).toContain(".vpg-segmented-control");
    });
  });

  describe("labels", () => {
    it("names a radio by its string label", () => {
      render(<SegmentedControl aria-label="Range" options={[{ value: "day", label: "Day" }]} />);
      expect(screen.getByRole("radio", { name: "Day" })).toBeInTheDocument();
    });

    it("lets aria-label override a string label as the radio's accessible name", () => {
      render(<SegmentedControl aria-label="Range" options={[{ value: "day", label: "D", "aria-label": "Day view" }]} />);
      expect(screen.getByRole("radio", { name: "Day view" })).toBeInTheDocument();
    });

    it("names a radio with a non-string label by its aria-label", () => {
      render(<SegmentedControl aria-label="Range" options={[{ value: "day", label: <strong>D</strong>, "aria-label": "Day view" }]} />);
      expect(screen.getByRole("radio", { name: "Day view" })).toBeInTheDocument();
      expect(screen.getByText("D").tagName).toBe("STRONG");
    });
  });

  describe("icon", () => {
    it("renders an aria-hidden icon before the label", () => {
      render(<SegmentedControl aria-label="Range" options={[{ value: "day", label: "Day", icon: Check }]} />);

      const segment = screen.getByRole("radio", { name: "Day" }).closest("label");
      const icon = segment?.querySelector(".vpg-segmented-control-segment-icon");
      expect(icon).not.toBeNull();
      expect(icon).toHaveAttribute("aria-hidden", "true");
    });

    it("renders no icon element when the option has none", () => {
      render(<SegmentedControl aria-label="Range" options={options} />);
      expect(document.querySelector(".vpg-segmented-control-segment-icon")).toBeNull();
    });
  });

  describe("selection", () => {
    it("selects nothing when neither value nor defaultValue is given", () => {
      render(<SegmentedControl aria-label="Range" options={options} />);
      for (const radio of screen.getAllByRole("radio")) {
        expect(radio).not.toBeChecked();
      }
    });

    it("seeds the uncontrolled selection from defaultValue and follows clicks", () => {
      const onChange = vi.fn();
      render(<SegmentedControl aria-label="Range" options={options} defaultValue="week" onChange={onChange} />);
      expect(screen.getByRole("radio", { name: "Week" })).toBeChecked();

      fireEvent.click(screen.getByRole("radio", { name: "Month" }));

      expect(screen.getByRole("radio", { name: "Month" })).toBeChecked();
      expect(screen.getByRole("radio", { name: "Week" })).not.toBeChecked();
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith("month");
    });

    it("updates uncontrolled without an onChange handler", () => {
      render(<SegmentedControl aria-label="Range" options={options} />);
      fireEvent.click(screen.getByRole("radio", { name: "Day" }));
      expect(screen.getByRole("radio", { name: "Day" })).toBeChecked();
    });

    it("keeps a controlled selection until the value prop changes", () => {
      const onChange = vi.fn();
      const { rerender } = render(<SegmentedControl aria-label="Range" options={options} value="day" onChange={onChange} />);

      fireEvent.click(screen.getByRole("radio", { name: "Week" }));

      expect(onChange).toHaveBeenCalledWith("week");
      expect(screen.getByRole("radio", { name: "Day" })).toBeChecked();
      expect(screen.getByRole("radio", { name: "Week" })).not.toBeChecked();

      rerender(<SegmentedControl aria-label="Range" options={options} value="week" onChange={onChange} />);

      expect(screen.getByRole("radio", { name: "Week" })).toBeChecked();
      expect(screen.getByRole("radio", { name: "Day" })).not.toBeChecked();
    });

    it("ignores defaultValue when value is given", () => {
      render(<SegmentedControl aria-label="Range" options={options} value="month" defaultValue="day" />);
      expect(screen.getByRole("radio", { name: "Month" })).toBeChecked();
      expect(screen.getByRole("radio", { name: "Day" })).not.toBeChecked();
    });

    it("does not select a disabled option", () => {
      const onChange = vi.fn();
      render(
        <SegmentedControl
          aria-label="Range"
          options={[
            { value: "day", label: "Day" },
            { value: "week", label: "Week", disabled: true },
          ]}
          defaultValue="day"
          onChange={onChange}
        />,
      );

      const week = screen.getByRole("radio", { name: "Week" });
      expect(week).toBeDisabled();
      fireEvent.click(screen.getByText("Week"));

      expect(onChange).not.toHaveBeenCalled();
      expect(week).not.toBeChecked();
      expect(screen.getByRole("radio", { name: "Day" })).toBeChecked();
      expect(screen.getByRole("radio", { name: "Day" })).toBeEnabled();
    });
  });

  describe("name", () => {
    it("shares one generated name across every radio", () => {
      render(<SegmentedControl aria-label="Range" options={options} />);
      const names = screen.getAllByRole("radio").map((radio) => (radio as HTMLInputElement).name);
      expect(names[0]).toBeTruthy();
      expect(new Set(names).size).toBe(1);
    });

    it("gives separate controls distinct generated names", () => {
      render(
        <>
          <SegmentedControl aria-label="First" options={options} />
          <SegmentedControl aria-label="Second" options={options} />
        </>,
      );
      const radios = screen.getAllByRole("radio") as HTMLInputElement[];
      expect(radios[0]?.name).not.toBe(radios[3]?.name);
    });

    it("uses the name prop on every radio when given", () => {
      render(<SegmentedControl aria-label="Range" options={options} name="range" />);
      for (const radio of screen.getAllByRole("radio")) {
        expect(radio).toHaveAttribute("name", "range");
      }
    });
  });

  describe("size and fullWidth", () => {
    it("defaults to the md size without the full-width class", () => {
      render(<SegmentedControl aria-label="Range" options={options} />);
      const group = screen.getByRole("radiogroup");
      expect(group).toHaveClass("vpg-segmented-control", "vpg-segmented-control-md");
      expect(group).not.toHaveClass("vpg-segmented-control-full");
    });

    it.each(["sm", "md", "lg"] as const)("applies the %s size class", (size) => {
      render(<SegmentedControl aria-label="Range" options={options} size={size} />);
      expect(screen.getByRole("radiogroup")).toHaveClass(`vpg-segmented-control-${size}`);
    });

    it("applies the full-width class when fullWidth is set", () => {
      render(<SegmentedControl aria-label="Range" options={options} fullWidth />);
      expect(screen.getByRole("radiogroup")).toHaveClass("vpg-segmented-control-full");
    });
  });

  describe("passthrough", () => {
    it("composes a caller-supplied className alongside its own classes", () => {
      render(<SegmentedControl aria-label="Range" options={options} className="custom" />);
      const group = screen.getByRole("radiogroup");
      expect(group).toHaveClass("custom");
      expect(group).toHaveClass("vpg-segmented-control");
    });

    it("forwards arbitrary attributes to the radiogroup", () => {
      render(<SegmentedControl aria-label="Range" options={options} data-testid="target" id="range" />);
      const group = screen.getByTestId("target");
      expect(group).toBe(screen.getByRole("radiogroup"));
      expect(group).toHaveAttribute("id", "range");
    });

    it("forwards a ref to the radiogroup element", () => {
      const ref = createRef<HTMLDivElement>();
      render(<SegmentedControl aria-label="Range" options={options} ref={ref} />);
      expect(ref.current).toBe(screen.getByRole("radiogroup"));
    });

    it("never assigns a --vpg-* custom property inline", () => {
      render(<SegmentedControl aria-label="Range" options={options} />);
      expect(screen.getByRole("radiogroup").getAttribute("style")).toBeNull();
    });
  });
});
