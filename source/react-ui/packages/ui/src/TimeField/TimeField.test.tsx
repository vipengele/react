import { act, fireEvent, render, screen } from "@testing-library/react";
import { LocaleProvider } from "@vipengele/react-tokens";
import { Locale, LocalTime } from "@vipengele/ts";
import { createRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { FormField } from "../FormField/FormField.js";
import { TimeField, type TimeFieldProps } from "./TimeField.js";

const enUS = new Locale("en-US");
const deDE = new Locale("de-DE");
const koKR = new Locale("ko-KR");

const group = () => screen.getByRole("group", { name: "Start" });
const segment = (label: "Hour" | "Minute" | "Second" | "AM/PM") => screen.getByRole("spinbutton", { name: label });
const segmentLabels = () => screen.getAllByRole("spinbutton").map((element) => element.getAttribute("aria-label"));
/** The input carrying the form value. It has no role, so no query in `screen` reaches it. */
const hidden = (container: HTMLElement) =>
  [...container.querySelectorAll("input")].find((input) => input.type === "hidden") as HTMLInputElement;

/** Real focus, not a synthesised event: moving between segments is asserted against `activeElement`. */
const focus = (element: HTMLElement) => act(() => element.focus());
const blur = (element: HTMLElement) => act(() => element.blur());
const press = (element: HTMLElement, key: string, init: Record<string, unknown> = {}) => fireEvent.keyDown(element, { key, ...init });
/** Presses each character of `keys` on whichever segment holds focus when it is pressed. */
const typeKeys = (keys: string) => {
  for (const key of keys) {
    press(document.activeElement as HTMLElement, key);
  }
};
const iso = (value: LocalTime | undefined) => value?.toString();
/** Dispatches a native `beforeinput`, as a virtual keyboard does, and returns it. */
const beforeInput = (element: HTMLElement, inputType: string, data: string | null = null) => {
  const event = new InputEvent("beforeinput", { inputType, data, bubbles: true, cancelable: true });
  act(() => {
    element.dispatchEvent(event);
  });
  return event;
};
/** Inserts each character of `text` into whichever segment holds focus when it arrives. */
const insertText = (text: string) => {
  for (const character of text) {
    beforeInput(document.activeElement as HTMLElement, "insertText", character);
  }
};

/** A US-English field labelled "Start", whatever the runtime's own locale. */
function Field(props: TimeFieldProps) {
  return <TimeField aria-label="Start" locale={enUS} {...props} />;
}

describe("TimeField", () => {
  describe("structure", () => {
    it("renders a marked group as the shell's direct child, with a spinbutton per segment", () => {
      render(<Field className="custom" />);
      expect(group()).toHaveClass("vpg-time-field", "vpg-field-shell-control", "custom");
      expect(group().parentElement).toHaveClass("vpg-field-shell");
      expect(segmentLabels()).toEqual(["Hour", "Minute", "AM/PM"]);
    });

    it("hides the literals between segments from assistive technology", () => {
      render(<Field defaultValue={LocalTime.of(9, 5)} />);
      const literals = group().querySelectorAll(".vpg-time-field-literal");
      expect([...literals].map((literal) => literal.textContent?.trim())).toEqual([":", ""]);
      for (const literal of literals) {
        expect(literal).toHaveAttribute("aria-hidden", "true");
      }
    });

    it("forwards arbitrary attributes and its ref to the group", () => {
      const ref = createRef<HTMLDivElement>();
      render(<Field ref={ref} data-testid="target" id="start" />);
      expect(screen.getByTestId("target")).toBe(group());
      expect(ref.current).toBe(group());
      expect(group()).toHaveAttribute("id", "start");
    });

    it("passes adornments to the shell's slots", () => {
      render(<Field leading={<span>at</span>} trailing={<span>local</span>} />);
      const shell = group().parentElement as HTMLElement;
      expect(shell.querySelector(".vpg-field-shell-leading")).toHaveTextContent("at");
      expect(shell.querySelector(".vpg-field-shell-trailing")).toHaveTextContent("local");
    });

    it("injects its stylesheet once for any number of fields", () => {
      render(
        <>
          <Field />
          <TimeField aria-label="End" locale={enUS} />
        </>,
      );
      const styles = document.head.querySelectorAll('style[data-href="vpg-time-field"]');
      expect(styles).toHaveLength(1);
      expect(styles[0]?.textContent).toContain(".vpg-time-field {");
    });

    it("never assigns a --vpg-* custom property inline", () => {
      render(<Field defaultValue={LocalTime.of(9, 5)} />);
      expect(group().getAttribute("style")).toBeNull();
      for (const element of screen.getAllByRole("spinbutton")) {
        expect(element.getAttribute("style")).toBeNull();
      }
    });
  });

  describe("spinbutton semantics", () => {
    it("reports each segment's value, range and text", () => {
      render(<Field defaultValue={LocalTime.of(21, 5)} />);
      expect(segment("Hour")).toHaveAttribute("aria-valuenow", "9");
      expect(segment("Hour")).toHaveAttribute("aria-valuetext", "09");
      expect(segment("Hour")).toHaveAttribute("aria-valuemin", "1");
      expect(segment("Hour")).toHaveAttribute("aria-valuemax", "12");
      expect(segment("Minute")).toHaveAttribute("aria-valuenow", "5");
      expect(segment("Minute")).toHaveAttribute("aria-valuemax", "59");
      expect(segment("AM/PM")).toHaveAttribute("aria-valuenow", "1");
      expect(segment("AM/PM")).toHaveAttribute("aria-valuetext", "PM");
      expect(segment("AM/PM")).toHaveTextContent("PM");
      expect(segment("Hour")).not.toHaveAttribute("data-empty");
    });

    it("omits aria-valuenow and aria-valuetext from an empty segment and shows a placeholder", () => {
      render(<Field />);
      expect(segment("Hour")).not.toHaveAttribute("aria-valuenow");
      expect(segment("Hour")).not.toHaveAttribute("aria-valuetext");
      expect(segment("Hour")).toHaveTextContent("––");
      expect(segment("Hour")).toHaveAttribute("data-empty");
    });

    it("puts every segment in the tab order", () => {
      render(<Field />);
      for (const element of screen.getAllByRole("spinbutton")) {
        expect(element).toHaveAttribute("tabindex", "0");
      }
    });
  });

  describe("locale", () => {
    it("shows a 24-hour clock with no AM/PM segment on a 24-hour locale (de-DE)", () => {
      render(<Field locale={deDE} defaultValue={LocalTime.of(21, 5)} />);
      expect(segmentLabels()).toEqual(["Hour", "Minute"]);
      expect(segment("Hour")).toHaveTextContent("21");
      expect(segment("Hour")).toHaveAttribute("aria-valuemin", "0");
      expect(segment("Hour")).toHaveAttribute("aria-valuemax", "23");
    });

    it("puts the AM/PM segment first on a period-first locale (ko-KR)", () => {
      render(<Field locale={koKR} defaultValue={LocalTime.of(21, 5)} />);
      expect(segmentLabels()).toEqual(["AM/PM", "Hour", "Minute"]);
      expect(segment("AM/PM")).toHaveTextContent("오후");
    });

    it("reads the nearest LocaleProvider when given no locale prop", () => {
      render(
        <LocaleProvider locale={deDE}>
          <TimeField aria-label="Start" />
        </LocaleProvider>,
      );
      expect(segmentLabels()).toEqual(["Hour", "Minute"]);
    });

    it("lets its locale prop win over the nearest LocaleProvider", () => {
      render(
        <LocaleProvider locale={deDE}>
          <TimeField aria-label="Start" locale={enUS} />
        </LocaleProvider>,
      );
      expect(segmentLabels()).toEqual(["Hour", "Minute", "AM/PM"]);
    });

    it("reseeds the segments when the locale changes", () => {
      const { rerender } = render(<Field locale={enUS} defaultValue={LocalTime.of(21, 5)} />);
      expect(segment("Hour")).toHaveTextContent("09");
      rerender(<Field locale={deDE} defaultValue={LocalTime.of(21, 5)} />);
      expect(segment("Hour")).toHaveTextContent("21");
    });

    it("keeps an edit in progress across renders that pass an equal locale as a new object", () => {
      const { rerender } = render(<Field locale={new Locale("en-US")} />);
      focus(segment("Hour"));
      typeKeys("1");
      rerender(<Field locale={new Locale("en-US")} />);
      expect(segment("Hour")).toHaveTextContent("1");
    });
  });

  describe("seconds", () => {
    it("shows a second segment when asked, and the hidden input carries the seconds", () => {
      const { container } = render(<Field seconds defaultValue={LocalTime.of(14, 30, 15)} />);
      expect(segmentLabels()).toEqual(["Hour", "Minute", "Second", "AM/PM"]);
      expect(segment("Second")).toHaveTextContent("15");
      expect(hidden(container)).toHaveValue("14:30:15");
    });

    it("seconds-off with a non-zero-seconds value keeps the hidden input at the full ISO until the first edit, and the first commit zeroes the seconds", () => {
      const onChange = vi.fn();
      const { container } = render(<Field defaultValue={LocalTime.of(14, 30, 15)} onChange={onChange} />);
      expect(segmentLabels()).toEqual(["Hour", "Minute", "AM/PM"]);
      expect(hidden(container)).toHaveValue("14:30:15");

      focus(segment("Minute"));
      blur(segment("Minute"));
      expect(onChange).not.toHaveBeenCalled();
      expect(hidden(container)).toHaveValue("14:30:15");

      focus(segment("Minute"));
      press(segment("Minute"), "ArrowUp");
      expect(hidden(container)).toHaveValue("14:30:15");
      blur(segment("Minute"));
      expect(onChange.mock.calls.map(([value]) => iso(value))).toEqual(["14:31"]);
      expect(hidden(container)).toHaveValue("14:31");
    });

    it("reseeds the segments when the seconds setting changes", () => {
      const { rerender } = render(<Field defaultValue={LocalTime.of(14, 30, 15)} />);
      rerender(<Field seconds defaultValue={LocalTime.of(14, 30, 15)} />);
      expect(segment("Second")).toHaveTextContent("15");
    });
  });

  describe("uncontrolled", () => {
    it("starts from defaultValue and commits what the user types", () => {
      const onChange = vi.fn();
      const { container } = render(<Field defaultValue={LocalTime.of(8, 0)} onChange={onChange} />);
      expect(hidden(container)).toHaveValue("08:00");

      focus(segment("Hour"));
      typeKeys("930p");
      expect(onChange.mock.calls.map(([value]) => iso(value))).toEqual(["21:30"]);
      expect(hidden(container)).toHaveValue("21:30");
      expect(segment("Hour")).toHaveTextContent("09");
    });

    it("starts empty with no defaultValue", () => {
      const { container } = render(<Field />);
      expect(hidden(container)).toHaveValue("");
    });

    it("commits without an onChange", () => {
      const { container } = render(<Field />);
      focus(segment("Hour"));
      typeKeys("930a");
      expect(hidden(container)).toHaveValue("09:30");
    });
  });

  describe("controlled", () => {
    function Controlled({ initial, onChange }: { initial?: LocalTime; onChange?: (value: LocalTime | undefined) => void }) {
      const [value, setValue] = useState<LocalTime | undefined>(initial);
      return (
        <Field
          value={value}
          onChange={(next) => {
            setValue(next);
            onChange?.(next);
          }}
        />
      );
    }

    it("shows the value it is given and reports commits to the parent", () => {
      const onChange = vi.fn();
      const { container } = render(<Controlled initial={LocalTime.of(10, 15)} onChange={onChange} />);
      expect(segment("Hour")).toHaveTextContent("10");

      focus(segment("Hour"));
      typeKeys("2");
      blur(segment("Minute"));
      expect(onChange.mock.calls.map(([value]) => iso(value))).toEqual(["02:15"]);
      expect(hidden(container)).toHaveValue("02:15");
    });

    it("treats a value of undefined as a controlled empty field", () => {
      const { container, rerender } = render(<Field value={undefined} />);
      focus(segment("Hour"));
      typeKeys("930a");
      expect(hidden(container)).toHaveValue("");
      expect(segment("Hour")).toHaveTextContent("09");
      blur(segment("AM/PM"));
      expect(segment("Hour")).toHaveTextContent("––");

      rerender(<Field value={LocalTime.of(7, 0)} />);
      expect(hidden(container)).toHaveValue("07:00");
    });

    it("follows a controlled update while focus is outside the field", () => {
      const { rerender } = render(<Field value={LocalTime.of(10, 15)} />);
      rerender(<Field value={LocalTime.of(11, 45)} />);
      expect(segment("Hour")).toHaveTextContent("11");
      expect(segment("Minute")).toHaveTextContent("45");
    });

    it("keeps its segments across renders that pass an equal value as a new object", () => {
      const { rerender } = render(<Field value={LocalTime.of(10, 15)} />);
      focus(segment("Hour"));
      press(segment("Hour"), "Backspace");
      blur(segment("Hour"));
      expect(group()).toHaveAttribute("aria-invalid", "true");

      rerender(<Field value={LocalTime.of(10, 15)} />);
      expect(segment("Hour")).toHaveTextContent("––");
      expect(group()).toHaveAttribute("aria-invalid", "true");
    });

    it("a controlled update during an edit does not overwrite the edit", () => {
      const onChange = vi.fn();
      const { rerender } = render(<Field value={LocalTime.of(10, 15)} onChange={onChange} />);
      focus(segment("Minute"));
      typeKeys("4");
      expect(segment("Minute")).toHaveTextContent("4");

      rerender(<Field value={LocalTime.of(18, 0)} onChange={onChange} />);
      expect(segment("Hour")).toHaveTextContent("10");
      expect(segment("Minute")).toHaveTextContent("4");

      typeKeys("5");
      expect(segment("Minute")).toHaveTextContent("45");
      blur(document.activeElement as HTMLElement);
      expect(onChange.mock.calls.map(([value]) => iso(value))).toEqual(["10:45"]);
    });

    it("shows the parent's value once focus leaves when the parent declines a commit", () => {
      const onChange = vi.fn();
      const { container } = render(<Field value={LocalTime.of(10, 15)} onChange={onChange} />);
      focus(segment("Hour"));
      typeKeys("2");
      blur(segment("Minute"));
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(segment("Hour")).toHaveTextContent("10");
      expect(hidden(container)).toHaveValue("10:15");
    });

    it("takes an update that landed mid-edit once focus leaves without an edit", () => {
      const { rerender } = render(<Field value={LocalTime.of(10, 15)} />);
      focus(segment("Hour"));
      rerender(<Field value={LocalTime.of(18, 0)} />);
      expect(segment("Hour")).toHaveTextContent("10");
      blur(segment("Hour"));
      expect(segment("Hour")).toHaveTextContent("06");
      expect(segment("AM/PM")).toHaveTextContent("PM");
    });
  });

  describe("commit", () => {
    it("commit fires once when the last segment completes the field and focus then leaves", () => {
      const onChange = vi.fn();
      render(<Field onChange={onChange} />);
      focus(segment("Hour"));
      typeKeys("1");
      expect(segment("Hour")).toHaveTextContent("1");
      typeKeys("1");
      expect(document.activeElement).toBe(segment("Minute"));
      typeKeys("05");
      expect(document.activeElement).toBe(segment("AM/PM"));
      typeKeys("a");
      expect(onChange).toHaveBeenCalledTimes(1);
      press(segment("AM/PM"), "Enter");
      blur(segment("AM/PM"));
      expect(onChange.mock.calls.map(([value]) => iso(value))).toEqual(["11:05"]);
    });

    it("does not commit when the last segment is filled while another is empty", () => {
      const onChange = vi.fn();
      render(<Field onChange={onChange} />);
      focus(segment("Minute"));
      typeKeys("30p");
      expect(onChange).not.toHaveBeenCalled();
      expect(group()).not.toHaveAttribute("aria-invalid", "true");
    });

    it("incomplete blur sets aria-invalid and does not fire onChange", () => {
      const onChange = vi.fn();
      const { container } = render(<Field onChange={onChange} />);
      focus(segment("Hour"));
      typeKeys("9");
      blur(segment("Minute"));
      expect(onChange).not.toHaveBeenCalled();
      expect(group()).toHaveAttribute("aria-invalid", "true");
      expect(segment("Hour")).toHaveTextContent("09");
      expect(hidden(container)).toHaveValue("");

      focus(segment("Minute"));
      typeKeys("30a");
      expect(group()).not.toHaveAttribute("aria-invalid", "true");
      expect(onChange.mock.calls.map(([value]) => iso(value))).toEqual(["09:30"]);
    });

    it("commits on Enter without preventing its default, with the hidden input current in the same tick", () => {
      const onChange = vi.fn();
      const { container } = render(<Field defaultValue={LocalTime.of(10, 15)} onChange={onChange} />);
      focus(segment("Minute"));
      press(segment("Minute"), "ArrowUp");

      // A document listener runs after React's own, where a native submit would read the form.
      let hiddenAtEnter: string | undefined;
      const read = () => {
        hiddenAtEnter = hidden(container).value;
      };
      document.addEventListener("keydown", read);
      expect(press(segment("Minute"), "Enter")).toBe(true);
      document.removeEventListener("keydown", read);
      expect(hiddenAtEnter).toBe("10:16");
      expect(onChange.mock.calls.map(([value]) => iso(value))).toEqual(["10:16"]);
    });

    it("flags a partly filled field on Enter", () => {
      render(<Field />);
      focus(segment("Hour"));
      typeKeys("9");
      press(segment("Minute"), "Enter");
      expect(group()).toHaveAttribute("aria-invalid", "true");
    });

    it("ignores an Enter that confirms an IME composition", () => {
      const onChange = vi.fn();
      render(<Field defaultValue={LocalTime.of(10, 15)} onChange={onChange} />);
      focus(segment("Minute"));
      press(segment("Minute"), "ArrowUp");
      press(segment("Minute"), "Enter", { isComposing: true });
      expect(onChange).not.toHaveBeenCalled();
    });

    it("commits undefined once every segment is cleared", () => {
      const onChange = vi.fn();
      const { container } = render(<Field defaultValue={LocalTime.of(10, 15)} onChange={onChange} />);
      for (const label of ["Hour", "Minute", "AM/PM"] as const) {
        focus(segment(label));
        press(segment(label), label === "Minute" ? "Delete" : "Backspace");
      }
      blur(segment("AM/PM"));
      expect(onChange).toHaveBeenCalledWith(undefined);
      expect(hidden(container)).toHaveValue("");
      expect(group()).not.toHaveAttribute("aria-invalid", "true");
    });
  });

  describe("min and max", () => {
    it("steps a filled field up to a bound and refuses a step past it", () => {
      const onChange = vi.fn();
      render(
        <Field locale={deDE} min={LocalTime.of(9, 0)} max={LocalTime.of(17, 0)} defaultValue={LocalTime.of(16, 0)} onChange={onChange} />,
      );
      focus(segment("Hour"));
      press(segment("Hour"), "ArrowUp");
      expect(segment("Hour")).toHaveTextContent("17");
      press(segment("Hour"), "ArrowUp");
      expect(segment("Hour")).toHaveTextContent("17");
      focus(segment("Minute"));
      expect(press(segment("Minute"), "ArrowUp")).toBe(false);
      expect(segment("Minute")).toHaveTextContent("00");
      blur(segment("Minute"));
      expect(onChange.mock.calls.map(([value]) => iso(value))).toEqual(["17:00"]);
      expect(group()).not.toHaveAttribute("aria-invalid", "true");
    });

    it("refuses a step down past min", () => {
      render(<Field locale={deDE} min={LocalTime.of(9, 0)} defaultValue={LocalTime.of(9, 30)} />);
      focus(segment("Hour"));
      press(segment("Hour"), "ArrowDown");
      expect(segment("Hour")).toHaveTextContent("09");
      press(segment("Minute"), "ArrowDown");
      expect(segment("Minute")).toHaveTextContent("29");
    });

    it("accepts a step from a value outside the bounds when it lands inside them", () => {
      const onChange = vi.fn();
      render(<Field locale={deDE} min={LocalTime.of(9, 0)} defaultValue={LocalTime.of(8, 59)} onChange={onChange} />);
      expect(group()).toHaveAttribute("aria-invalid", "true");
      focus(segment("Hour"));
      press(segment("Hour"), "ArrowUp");
      expect(segment("Hour")).toHaveTextContent("09");
      blur(segment("Hour"));
      expect(onChange.mock.calls.map(([value]) => iso(value))).toEqual(["09:59"]);
      expect(group()).not.toHaveAttribute("aria-invalid", "true");
    });

    it("steps a partly filled field freely and leaves the bound to the commit", () => {
      const onChange = vi.fn();
      render(<Field locale={deDE} min={LocalTime.of(9, 0)} onChange={onChange} />);
      focus(segment("Hour"));
      press(segment("Hour"), "ArrowUp");
      expect(segment("Hour")).toHaveTextContent("00");
      focus(segment("Minute"));
      typeKeys("15");
      expect(onChange).not.toHaveBeenCalled();
      expect(group()).toHaveAttribute("aria-invalid", "true");
      expect(segment("Hour")).toHaveTextContent("00");
      expect(segment("Minute")).toHaveTextContent("15");
    });

    it("commits a typed time exactly on min", () => {
      const onChange = vi.fn();
      render(<Field locale={deDE} min={LocalTime.of(9, 0)} onChange={onChange} />);
      focus(segment("Hour"));
      typeKeys("0900");
      expect(onChange.mock.calls.map(([value]) => iso(value))).toEqual(["09:00"]);
      expect(group()).not.toHaveAttribute("aria-invalid", "true");
    });

    it("rejects a typed time before min: keeps it on screen, sets aria-invalid and does not call onChange", () => {
      const onChange = vi.fn();
      const { container } = render(<Field locale={deDE} min={LocalTime.of(9, 0)} onChange={onChange} />);
      focus(segment("Hour"));
      typeKeys("0830");
      expect(group()).toHaveAttribute("aria-invalid", "true");
      expect(segment("Hour")).toHaveTextContent("08");
      expect(segment("Minute")).toHaveTextContent("30");
      blur(segment("Minute"));
      expect(onChange).not.toHaveBeenCalled();
      expect(group()).toHaveAttribute("aria-invalid", "true");
      expect(hidden(container)).toHaveValue("");

      focus(segment("Hour"));
      typeKeys("10");
      expect(group()).toHaveAttribute("aria-invalid", "true");
      blur(segment("Minute"));
      expect(onChange.mock.calls.map(([value]) => iso(value))).toEqual(["10:30"]);
      expect(group()).not.toHaveAttribute("aria-invalid", "true");
      expect(hidden(container)).toHaveValue("10:30");
    });

    it("rejects an Enter on a filled time outside the bounds", () => {
      const onChange = vi.fn();
      render(<Field locale={deDE} max={LocalTime.of(12, 0)} defaultValue={LocalTime.of(11, 0)} onChange={onChange} />);
      focus(segment("Minute"));
      typeKeys("3");
      press(segment("Minute"), "Enter");
      expect(group()).not.toHaveAttribute("aria-invalid", "true");
      expect(onChange.mock.calls.map(([value]) => iso(value))).toEqual(["11:03"]);

      focus(segment("Hour"));
      typeKeys("13");
      expect(group()).not.toHaveAttribute("aria-invalid", "true");
      press(segment("Minute"), "Enter");
      expect(group()).toHaveAttribute("aria-invalid", "true");
      expect(segment("Hour")).toHaveTextContent("13");
      expect(onChange).toHaveBeenCalledTimes(1);
    });

    it("keeps each segment's aria-valuemin and aria-valuemax at the segment's own range", () => {
      render(<Field locale={deDE} min={LocalTime.of(9, 15)} max={LocalTime.of(17, 45)} defaultValue={LocalTime.of(12, 0)} />);
      expect(segment("Hour")).toHaveAttribute("aria-valuemin", "0");
      expect(segment("Hour")).toHaveAttribute("aria-valuemax", "23");
      expect(segment("Minute")).toHaveAttribute("aria-valuemin", "0");
      expect(segment("Minute")).toHaveAttribute("aria-valuemax", "59");
    });

    it("bounds a 12-hour field by its time of day, period included", () => {
      const onChange = vi.fn();
      render(<Field max={LocalTime.of(12, 0)} defaultValue={LocalTime.of(11, 30)} onChange={onChange} />);
      focus(segment("AM/PM"));
      press(segment("AM/PM"), "ArrowUp");
      expect(segment("AM/PM")).toHaveTextContent("AM");

      focus(segment("Hour"));
      typeKeys("1200p");
      expect(onChange.mock.calls.map(([value]) => iso(value))).toEqual(["12:00"]);
      expect(group()).not.toHaveAttribute("aria-invalid", "true");

      focus(segment("Hour"));
      typeKeys("0100p");
      expect(group()).toHaveAttribute("aria-invalid", "true");
      expect(segment("Hour")).toHaveTextContent("01");
      expect(segment("AM/PM")).toHaveTextContent("PM");
      expect(onChange).toHaveBeenCalledTimes(1);
    });

    it("bounds a field with seconds to the second", () => {
      const onChange = vi.fn();
      render(<Field locale={deDE} seconds max={LocalTime.of(17, 0, 30)} defaultValue={LocalTime.of(17, 0, 29)} onChange={onChange} />);
      focus(segment("Second"));
      press(segment("Second"), "ArrowUp");
      expect(segment("Second")).toHaveTextContent("30");
      press(segment("Second"), "ArrowUp");
      expect(segment("Second")).toHaveTextContent("30");
      press(segment("Second"), "Enter");
      expect(onChange.mock.calls.map(([value]) => iso(value))).toEqual(["17:00:30"]);

      typeKeys("31");
      expect(group()).toHaveAttribute("aria-invalid", "true");
      expect(segment("Second")).toHaveTextContent("31");
      expect(onChange).toHaveBeenCalledTimes(1);
    });

    it("shows a defaultValue outside the bounds as it is, flagged and never reported", () => {
      const onChange = vi.fn();
      const { container } = render(<Field locale={deDE} min={LocalTime.of(9, 0)} defaultValue={LocalTime.of(8, 0)} onChange={onChange} />);
      expect(group()).toHaveAttribute("aria-invalid", "true");
      expect(segment("Hour")).toHaveTextContent("08");
      expect(hidden(container)).toHaveValue("08:00");
      focus(segment("Hour"));
      press(segment("Hour"), "Enter");
      blur(segment("Hour"));
      expect(onChange).not.toHaveBeenCalled();
      expect(group()).toHaveAttribute("aria-invalid", "true");
    });

    it("refuses a step that leaves a filled field outside the bounds, from a value already outside them too", () => {
      render(<Field locale={deDE} min={LocalTime.of(9, 0)} defaultValue={LocalTime.of(7, 0)} />);
      focus(segment("Hour"));
      press(segment("Hour"), "ArrowUp");
      expect(segment("Hour")).toHaveTextContent("07");
    });

    it("shows a controlled value outside the bounds flagged, and clears the flag once the value moves inside them", () => {
      const onChange = vi.fn();
      const { rerender } = render(<Field locale={deDE} max={LocalTime.of(17, 0)} value={LocalTime.of(18, 0)} onChange={onChange} />);
      expect(group()).toHaveAttribute("aria-invalid", "true");
      expect(segment("Hour")).toHaveTextContent("18");
      expect(onChange).not.toHaveBeenCalled();

      rerender(<Field locale={deDE} max={LocalTime.of(17, 0)} value={LocalTime.of(16, 0)} onChange={onChange} />);
      expect(group()).not.toHaveAttribute("aria-invalid", "true");
      expect(onChange).not.toHaveBeenCalled();
    });

    it("clears a rejected time when a controlled update lands while focus is outside the field", () => {
      const onChange = vi.fn();
      const { rerender } = render(<Field locale={deDE} min={LocalTime.of(9, 0)} value={LocalTime.of(10, 0)} onChange={onChange} />);
      focus(segment("Hour"));
      typeKeys("0830");
      blur(segment("Minute"));
      expect(group()).toHaveAttribute("aria-invalid", "true");
      expect(segment("Hour")).toHaveTextContent("08");

      rerender(<Field locale={deDE} min={LocalTime.of(9, 0)} value={LocalTime.of(11, 0)} onChange={onChange} />);
      expect(group()).not.toHaveAttribute("aria-invalid", "true");
      expect(segment("Hour")).toHaveTextContent("11");
      expect(segment("Minute")).toHaveTextContent("00");
      expect(onChange).not.toHaveBeenCalled();
    });

    it("commits a rejected time once the bounds change to take it in, and keeps one they still exclude", () => {
      const onChange = vi.fn();
      const { container, rerender } = render(<Field locale={deDE} min={LocalTime.of(9, 0)} onChange={onChange} />);
      focus(segment("Hour"));
      typeKeys("0830");
      blur(segment("Minute"));
      expect(group()).toHaveAttribute("aria-invalid", "true");

      rerender(<Field locale={deDE} min={LocalTime.of(8, 45)} onChange={onChange} />);
      expect(group()).toHaveAttribute("aria-invalid", "true");
      expect(onChange).not.toHaveBeenCalled();

      rerender(<Field locale={deDE} min={LocalTime.of(8, 0)} onChange={onChange} />);
      expect(onChange.mock.calls.map(([value]) => iso(value))).toEqual(["08:30"]);
      expect(group()).not.toHaveAttribute("aria-invalid", "true");
      expect(hidden(container)).toHaveValue("08:30");
      expect(segment("Hour")).toHaveTextContent("08");
    });

    it("re-checks nothing but a rejected time when the bounds change", () => {
      const onChange = vi.fn();
      const { rerender } = render(<Field locale={deDE} max={LocalTime.of(12, 0)} defaultValue={LocalTime.of(11, 0)} onChange={onChange} />);
      rerender(<Field locale={deDE} max={LocalTime.of(10, 0)} defaultValue={LocalTime.of(11, 0)} onChange={onChange} />);
      expect(group()).toHaveAttribute("aria-invalid", "true");
      rerender(<Field locale={deDE} max={LocalTime.of(12, 0)} defaultValue={LocalTime.of(11, 0)} onChange={onChange} />);
      expect(group()).not.toHaveAttribute("aria-invalid", "true");
      expect(onChange).not.toHaveBeenCalled();
    });

    it("keeps a rejected time through a controlled update that lands while focus is inside the field", () => {
      const { rerender } = render(<Field locale={deDE} min={LocalTime.of(9, 0)} value={LocalTime.of(10, 0)} />);
      focus(segment("Hour"));
      typeKeys("0830");
      rerender(<Field locale={deDE} min={LocalTime.of(9, 0)} value={LocalTime.of(11, 0)} />);
      expect(group()).toHaveAttribute("aria-invalid", "true");
      expect(segment("Hour")).toHaveTextContent("08");
    });
  });

  describe("FormField", () => {
    it("receives FormField's id, label and description on the group", () => {
      render(
        <FormField label="Start" hint="Local time">
          <TimeField locale={enUS} />
        </FormField>,
      );
      const field = screen.getByRole("group", { name: "Start" });
      expect(field).toHaveAccessibleDescription("Local time");
      expect(field).toHaveAttribute("id");
    });

    it("FormField error and the incomplete flag OR together into aria-invalid", () => {
      const { rerender } = render(
        <FormField label="Start" error="Required">
          <TimeField locale={enUS} defaultValue={LocalTime.of(9, 0)} />
        </FormField>,
      );
      expect(group()).toHaveAttribute("aria-invalid", "true");

      rerender(
        <FormField label="Start">
          <TimeField locale={enUS} defaultValue={LocalTime.of(9, 0)} />
        </FormField>,
      );
      expect(group()).not.toHaveAttribute("aria-invalid", "true");

      focus(segment("Hour"));
      press(segment("Hour"), "Backspace");
      blur(segment("Hour"));
      expect(group()).toHaveAttribute("aria-invalid", "true");

      rerender(
        <FormField label="Start" error="Required">
          <TimeField locale={enUS} defaultValue={LocalTime.of(9, 0)} />
        </FormField>,
      );
      expect(group()).toHaveAttribute("aria-invalid", "true");
    });
  });

  describe("keyboard", () => {
    it("steps a segment with the up and down arrows, wrapping at either end", () => {
      render(<Field locale={deDE} defaultValue={LocalTime.of(23, 0)} />);
      focus(segment("Hour"));
      expect(press(segment("Hour"), "ArrowUp")).toBe(false);
      expect(segment("Hour")).toHaveTextContent("00");
      press(segment("Hour"), "ArrowDown");
      expect(segment("Hour")).toHaveTextContent("23");
    });

    it("toggles the period with the arrows", () => {
      render(<Field defaultValue={LocalTime.of(9, 0)} />);
      focus(segment("AM/PM"));
      press(segment("AM/PM"), "ArrowDown");
      expect(segment("AM/PM")).toHaveTextContent("PM");
    });

    it("typed a/p selects the period", () => {
      render(<Field />);
      focus(segment("AM/PM"));
      expect(press(segment("AM/PM"), "p")).toBe(false);
      expect(segment("AM/PM")).toHaveTextContent("PM");
      press(segment("AM/PM"), "A");
      expect(segment("AM/PM")).toHaveTextContent("AM");
    });

    it("ignores a letter that names neither period, and a letter typed into a digit segment", () => {
      render(<Field defaultValue={LocalTime.of(9, 0)} />);
      focus(segment("AM/PM"));
      expect(press(segment("AM/PM"), "x")).toBe(true);
      expect(press(segment("AM/PM"), "1")).toBe(true);
      expect(segment("AM/PM")).toHaveTextContent("AM");
      expect(press(segment("Hour"), "p")).toBe(true);
      expect(segment("Hour")).toHaveTextContent("09");
    });

    it("leaves a chord to the page", () => {
      render(<Field defaultValue={LocalTime.of(9, 0)} />);
      focus(segment("Hour"));
      for (const modifier of ["ctrlKey", "metaKey", "altKey"]) {
        expect(press(segment("Hour"), "1", { [modifier]: true })).toBe(true);
      }
      expect(segment("Hour")).toHaveTextContent("09");
    });

    it("leaves Tab to the browser", () => {
      render(<Field />);
      expect(press(segment("Hour"), "Tab")).toBe(true);
    });

    it("clears a segment with Backspace and Delete", () => {
      render(<Field defaultValue={LocalTime.of(9, 30)} />);
      focus(segment("Hour"));
      expect(press(segment("Hour"), "Backspace")).toBe(false);
      press(segment("Minute"), "Delete");
      expect(segment("Hour")).toHaveTextContent("––");
      expect(segment("Minute")).toHaveTextContent("––");
    });

    it("moves between segments with the arrows, stopping at either end", () => {
      render(<Field />);
      focus(segment("Hour"));
      expect(press(segment("Hour"), "ArrowRight")).toBe(false);
      expect(document.activeElement).toBe(segment("Minute"));
      press(segment("Minute"), "ArrowRight");
      press(segment("AM/PM"), "ArrowRight");
      expect(document.activeElement).toBe(segment("AM/PM"));
      press(segment("AM/PM"), "ArrowLeft");
      expect(document.activeElement).toBe(segment("Minute"));
      press(segment("Minute"), "ArrowLeft");
      press(segment("Hour"), "ArrowLeft");
      expect(document.activeElement).toBe(segment("Hour"));
    });

    it("right-to-left arrow order follows the visual order, with the DOM in logical order", () => {
      render(<Field style={{ direction: "rtl" }} />);
      expect(segmentLabels()).toEqual(["Hour", "Minute", "AM/PM"]);
      focus(segment("Hour"));
      press(segment("Hour"), "ArrowLeft");
      expect(document.activeElement).toBe(segment("Minute"));
      press(segment("Minute"), "ArrowRight");
      expect(document.activeElement).toBe(segment("Hour"));
    });

    it("starts a segment afresh when focus returns to it", () => {
      render(<Field />);
      focus(segment("Hour"));
      typeKeys("1");
      focus(segment("Minute"));
      focus(segment("Hour"));
      typeKeys("2");
      expect(segment("Hour")).toHaveTextContent("02");
      expect(document.activeElement).toBe(segment("Minute"));
    });

    it("passes the caller's focus, blur and key handlers through", () => {
      const onFocus = vi.fn();
      const onBlur = vi.fn();
      const onKeyDown = vi.fn();
      render(<Field onFocus={onFocus} onBlur={onBlur} onKeyDown={onKeyDown} />);
      focus(segment("Hour"));
      press(segment("Hour"), "1");
      blur(segment("Hour"));
      expect(onFocus).toHaveBeenCalledTimes(1);
      expect(onBlur).toHaveBeenCalledTimes(1);
      expect(onKeyDown).toHaveBeenCalledTimes(1);
    });
  });

  describe("virtual keyboard", () => {
    it("asks each segment for the keyboard its content needs", () => {
      render(<Field />);
      for (const label of ["Hour", "Minute"] as const) {
        expect(segment(label)).toHaveAttribute("inputmode", "numeric");
      }
      expect(segment("AM/PM")).toHaveAttribute("inputmode", "text");
    });

    it("makes every segment an editable host once a touch or a pen presses the field, and not for a mouse", () => {
      render(<Field />);
      for (const element of screen.getAllByRole("spinbutton")) {
        expect(element).toHaveAttribute("contenteditable", "false");
      }
      fireEvent.pointerDown(group(), { pointerType: "mouse" });
      expect(segment("Hour")).toHaveAttribute("contenteditable", "false");

      fireEvent.pointerDown(segment("Minute"), { pointerType: "touch" });
      for (const element of screen.getAllByRole("spinbutton")) {
        expect(element).toHaveAttribute("contenteditable", "true");
        expect(element).toHaveAttribute("autocapitalize", "off");
        expect(element).toHaveAttribute("autocorrect", "off");
        expect(element).toHaveAttribute("spellcheck", "false");
      }
    });

    it("labels the virtual Enter key next on every segment but the logically last, which reads done", () => {
      const { unmount } = render(<Field seconds />);
      expect(screen.getAllByRole("spinbutton").map((element) => element.getAttribute("enterkeyhint"))).toEqual([
        "next",
        "next",
        "next",
        "done",
      ]);
      unmount();

      render(<Field locale={koKR} />);
      expect(segment("AM/PM")).toHaveAttribute("enterkeyhint", "next");
      expect(segment("Minute")).toHaveAttribute("enterkeyhint", "done");
    });

    it("types inserted digits and a period letter, auto-advancing and committing on the last segment", () => {
      const onChange = vi.fn();
      const { container } = render(<Field onChange={onChange} />);
      focus(segment("Hour"));
      const first = beforeInput(segment("Hour"), "insertText", "1");
      expect(first.defaultPrevented).toBe(true);
      expect(segment("Hour")).toHaveTextContent("1");
      expect(document.activeElement).toBe(segment("Hour"));

      insertText("1");
      expect(segment("Hour")).toHaveTextContent("11");
      expect(document.activeElement).toBe(segment("Minute"));
      insertText("05");
      expect(document.activeElement).toBe(segment("AM/PM"));
      expect(onChange).not.toHaveBeenCalled();

      insertText("p");
      expect(segment("AM/PM")).toHaveTextContent("PM");
      expect(onChange.mock.calls.map(([value]) => iso(value))).toEqual(["23:05"]);
      expect(hidden(container)).toHaveValue("23:05");
    });

    it("types a run of characters across the segments it fills, skipping what a segment does not take", () => {
      const onChange = vi.fn();
      render(<Field onChange={onChange} />);
      focus(segment("Hour"));
      beforeInput(segment("Hour"), "insertText", "0x93");
      expect(segment("Hour")).toHaveTextContent("09");
      expect(segment("Minute")).toHaveTextContent("3");
      expect(document.activeElement).toBe(segment("Minute"));

      beforeInput(segment("Minute"), "insertReplacementText", "0a7");
      expect(onChange.mock.calls.map(([value]) => iso(value))).toEqual(["09:30"]);
    });

    it("ignores an insertion that a segment takes nothing from, and one with no data", () => {
      render(<Field defaultValue={LocalTime.of(9, 30)} />);
      focus(segment("Hour"));
      expect(beforeInput(segment("Hour"), "insertText", "p").defaultPrevented).toBe(true);
      expect(beforeInput(segment("Hour"), "insertText", "٣").defaultPrevented).toBe(true);
      beforeInput(segment("Hour"), "insertText");
      beforeInput(segment("Hour"), "insertReplacementText");
      expect(beforeInput(segment("AM/PM"), "insertText", "7").defaultPrevented).toBe(true);
      expect(segment("Hour")).toHaveTextContent("09");
      expect(segment("AM/PM")).toHaveTextContent("AM");
    });

    it("clears a segment on a backward or forward deletion", () => {
      const onChange = vi.fn();
      render(<Field defaultValue={LocalTime.of(9, 30)} onChange={onChange} />);
      focus(segment("Hour"));
      expect(beforeInput(segment("Hour"), "deleteContentBackward").defaultPrevented).toBe(true);
      expect(segment("Hour")).toHaveTextContent("––");
      focus(segment("Minute"));
      beforeInput(segment("Minute"), "deleteContentForward");
      expect(segment("Minute")).toHaveTextContent("––");
      blur(segment("Minute"));
      expect(onChange).not.toHaveBeenCalled();
      expect(group()).toHaveAttribute("aria-invalid", "true");
    });

    it("prevents every other input type without editing the segment", () => {
      render(<Field defaultValue={LocalTime.of(9, 30)} />);
      focus(segment("Minute"));
      for (const inputType of [
        "insertFromPaste",
        "insertParagraph",
        "insertLineBreak",
        "formatBold",
        "historyUndo",
        "deleteWordBackward",
      ]) {
        expect(beforeInput(segment("Minute"), inputType, "1").defaultPrevented).toBe(true);
      }
      expect(segment("Minute")).toHaveTextContent("30");
    });

    it("types only what a composition appends to its text", () => {
      render(<Field />);
      focus(segment("Minute"));
      act(() => {
        segment("Minute").dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true }));
      });
      expect(beforeInput(segment("Minute"), "insertCompositionText", "3").defaultPrevented).toBe(true);
      expect(segment("Minute")).toHaveTextContent("3");
      beforeInput(segment("Minute"), "insertCompositionText", "3");
      expect(segment("Minute")).toHaveTextContent("3");
      beforeInput(segment("Minute"), "insertCompositionText", "4");
      expect(segment("Minute")).toHaveTextContent("3");
      act(() => {
        segment("Minute").dispatchEvent(new CompositionEvent("compositionend", { bubbles: true }));
      });
      beforeInput(segment("Minute"), "insertCompositionText", "5");
      expect(segment("Minute")).toHaveTextContent("35");
      expect(document.activeElement).toBe(segment("AM/PM"));
    });

    it("types nothing for a composition update with no data", () => {
      render(<Field />);
      focus(segment("Hour"));
      beforeInput(segment("Hour"), "insertCompositionText");
      beforeInput(segment("Hour"), "insertCompositionText", "1");
      expect(segment("Hour")).toHaveTextContent("1");
    });

    it("puts back the rendered text after an edit the browser could not be stopped from making", () => {
      render(<Field defaultValue={LocalTime.of(9, 30)} />);
      segment("Hour").textContent = "09p";
      act(() => {
        segment("Hour").dispatchEvent(new InputEvent("input", { inputType: "insertCompositionText", data: "p", bubbles: true }));
      });
      expect(segment("Hour").textContent).toBe("09");
      press(segment("Hour"), "ArrowUp");
      expect(segment("Hour").textContent).toBe("10");
    });

    it("leaves a key a virtual keyboard or an IME reports without a usable key to beforeinput", () => {
      render(<Field defaultValue={LocalTime.of(9, 30)} />);
      focus(segment("Hour"));
      expect(press(segment("Hour"), "Unidentified", { keyCode: 229 })).toBe(true);
      expect(press(segment("Hour"), "Unidentified")).toBe(true);
      expect(press(segment("Hour"), "Process", { keyCode: 229 })).toBe(true);
      expect(press(segment("Hour"), "Backspace", { isComposing: true })).toBe(true);
      expect(segment("Hour")).toHaveTextContent("09");
      expect(press(segment("Hour"), "Backspace")).toBe(false);
      expect(segment("Hour")).toHaveTextContent("––");
    });
  });

  describe("pressing the field outside a segment", () => {
    it("focuses the first segment of an empty field from the group, a literal or the shell's padding", () => {
      render(<Field />);
      const shell = group().parentElement as HTMLElement;
      const literal = group().querySelector(".vpg-time-field-literal") as HTMLElement;
      for (const target of [group(), literal, shell]) {
        blur(document.activeElement as HTMLElement);
        expect(fireEvent.mouseDown(target)).toBe(false);
        fireEvent.click(target);
        expect(document.activeElement).toBe(segment("Hour"));
      }
    });

    it("focuses the first empty segment, else the first one", () => {
      render(<Field defaultValue={LocalTime.of(9, 30)} />);
      fireEvent.click(group());
      expect(document.activeElement).toBe(segment("Hour"));

      focus(segment("Minute"));
      press(segment("Minute"), "Backspace");
      fireEvent.click(group());
      expect(document.activeElement).toBe(segment("Minute"));
    });

    it("leaves a press on a segment or inside an adornment to the browser", () => {
      render(<Field leading={<button type="button">Now</button>} trailing={<span>local</span>} />);
      focus(segment("Minute"));
      expect(fireEvent.mouseDown(segment("Minute"))).toBe(true);
      fireEvent.click(segment("Minute"));
      expect(document.activeElement).toBe(segment("Minute"));

      const now = screen.getByRole("button", { name: "Now" });
      expect(fireEvent.mouseDown(now)).toBe(true);
      fireEvent.click(now);
      expect(fireEvent.mouseDown(screen.getByText("local"))).toBe(true);
      fireEvent.click(screen.getByText("local"));
      expect(document.activeElement).toBe(segment("Minute"));
    });

    it("does nothing while disabled", () => {
      render(<Field disabled />);
      expect(fireEvent.mouseDown(group())).toBe(true);
      fireEvent.click(group());
      expect(document.activeElement).toBe(document.body);
    });
  });

  describe("form participation", () => {
    it("carries the name and ISO value on a hidden input, never on the segments", () => {
      const { container } = render(<Field name="start" defaultValue={LocalTime.of(14, 30)} />);
      expect(hidden(container)).toHaveAttribute("name", "start");
      expect(hidden(container)).toHaveValue("14:30");
      expect(hidden(container)).not.toBeDisabled();
      expect(container.querySelectorAll("[name]")).toHaveLength(1);
    });

    it("submits the ISO value with the form", () => {
      const { container } = render(
        <form>
          <Field name="start" defaultValue={LocalTime.of(14, 30, 15)} />
        </form>,
      );
      const data = new FormData(container.querySelector("form") as HTMLFormElement);
      expect(data.get("start")).toBe("14:30:15");
    });
  });

  describe("disabled", () => {
    it("marks the group, takes every segment out of the tab order and disables the hidden input", () => {
      const { container } = render(<Field name="start" disabled defaultValue={LocalTime.of(9, 0)} />);
      expect(group()).toHaveAttribute("aria-disabled", "true");
      for (const element of screen.getAllByRole("spinbutton")) {
        expect(element).toHaveAttribute("tabindex", "-1");
      }
      expect(hidden(container)).toBeDisabled();
    });

    it("is not editable, so focusing it raises no virtual keyboard, and ignores what beforeinput delivers", () => {
      render(<Field disabled defaultValue={LocalTime.of(9, 0)} />);
      fireEvent.pointerDown(segment("Hour"), { pointerType: "pen" });
      for (const element of screen.getAllByRole("spinbutton")) {
        expect(element).toHaveAttribute("contenteditable", "false");
      }
      expect(beforeInput(segment("Hour"), "insertText", "1").defaultPrevented).toBe(true);
      beforeInput(segment("Hour"), "deleteContentBackward");
      expect(segment("Hour")).toHaveTextContent("09");
    });

    it("ignores keys and keeps a pointer from focusing a segment", () => {
      const onChange = vi.fn();
      render(<Field disabled defaultValue={LocalTime.of(9, 0)} onChange={onChange} />);
      expect(fireEvent.mouseDown(segment("Hour"))).toBe(false);
      press(segment("Hour"), "ArrowUp");
      press(segment("Hour"), "Enter");
      expect(segment("Hour")).toHaveTextContent("09");
      expect(onChange).not.toHaveBeenCalled();
    });

    it("lets a pointer focus an enabled segment", () => {
      render(<Field />);
      expect(fireEvent.mouseDown(segment("Hour"))).toBe(true);
      expect(group()).not.toHaveAttribute("aria-disabled");
    });
  });
});
