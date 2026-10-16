import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { Locale, LocalTime } from "@vipengele/ts";
import { createRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { FormField } from "../FormField/FormField.js";
import type { TimeRange } from "../internal/localRange.js";
import { TimeRangeField, type TimeRangeFieldProps } from "./TimeRangeField.js";

const deDE = new Locale("de-DE");
const enUS = new Locale("en-US");

const time = (hour: number, minute = 0) => LocalTime.of(hour, minute);
const range = (start: LocalTime, end: LocalTime): TimeRange => ({ start, end });

const field = () => screen.getByRole("group", { name: "Shift" });
const editor = (end: "Start" | "End", label = "Shift") => screen.getByRole("group", { name: `${label} ${end}` });
const segment = (end: "Start" | "End", label: "Hour" | "Minute" | "Second" | "AM/PM") =>
  within(editor(end)).getByRole("spinbutton", { name: label });
const texts = (end: "Start" | "End") =>
  within(editor(end))
    .getAllByRole("spinbutton")
    .map((element) => element.textContent);
const hiddenInputs = (container: HTMLElement) =>
  [...container.querySelectorAll("input")].filter((input) => input.type === "hidden").map((input) => [input.name, input.value]);

const focus = (element: HTMLElement) => act(() => element.focus());
const blur = (element: HTMLElement) => act(() => element.blur());
const press = (element: HTMLElement, key: string) => fireEvent.keyDown(element, { key });
/** Presses each character of `keys` on whichever segment holds focus when it is pressed. */
const typeKeys = (keys: string) => {
  for (const key of keys) {
    press(document.activeElement as HTMLElement, key);
  }
};
/** Moves focus out of the field, the way Tab past its last segment does. */
const leave = () => blur(document.activeElement as HTMLElement);
const iso = (value: TimeRange | undefined) => (value === undefined ? undefined : `${value.start.toString()}/${value.end.toString()}`);

/** A 24-hour field labelled "Shift", whatever the runtime's own locale. */
function Field(props: TimeRangeFieldProps) {
  return <TimeRangeField aria-label="Shift" locale={deDE} {...props} />;
}

describe("TimeRangeField", () => {
  describe("structure", () => {
    it("renders a marked outer group as the shell's direct child, holding a group per editor", () => {
      render(<Field className="custom" />);
      expect(field()).toHaveClass("vpg-time-range-field", "vpg-field-shell-control", "custom");
      expect(field().parentElement).toHaveClass("vpg-field-shell", "vpg-time-range-field-shell");
      expect(field()).toContainElement(editor("Start"));
      expect(field()).toContainElement(editor("End"));
      expect(
        within(editor("Start"))
          .getAllByRole("spinbutton")
          .map((element) => element.getAttribute("aria-label")),
      ).toEqual(["Hour", "Minute"]);
      expect(within(editor("End")).getAllByRole("spinbutton")).toHaveLength(2);
    });

    it("hides the separator and the literals from assistive technology", () => {
      render(<Field />);
      const separator = field().querySelector(".vpg-time-range-field-separator") as HTMLElement;
      expect(separator).toHaveAttribute("aria-hidden", "true");
      for (const literal of field().querySelectorAll(".vpg-time-field-literal")) {
        expect(literal).toHaveAttribute("aria-hidden", "true");
      }
    });

    it("forwards arbitrary attributes and its ref to the outer group", () => {
      const ref = createRef<HTMLDivElement>();
      render(<Field ref={ref} data-testid="target" id="shift" />);
      expect(screen.getByTestId("target")).toBe(field());
      expect(ref.current).toBe(field());
      expect(field()).toHaveAttribute("id", "shift");
    });

    it("passes adornments to the shell's slots", () => {
      render(<Field leading={<span>from</span>} trailing={<span>local</span>} />);
      const shell = field().parentElement as HTMLElement;
      expect(shell.querySelector(".vpg-field-shell-leading")).toHaveTextContent("from");
      expect(shell.querySelector(".vpg-field-shell-trailing")).toHaveTextContent("local");
    });

    it("injects its stylesheet and the segments' once for any number of fields", () => {
      render(
        <>
          <Field />
          <TimeRangeField aria-label="Break" locale={deDE} />
        </>,
      );
      expect(document.querySelectorAll('style[data-href="vpg-time-range-field"]')).toHaveLength(1);
      expect(document.querySelectorAll('style[data-href="vpg-time-field"]')).toHaveLength(1);
    });

    it("shows the ends of the value in the locale's segments", () => {
      render(<TimeRangeField aria-label="Shift" locale={enUS} defaultValue={range(time(9, 5), time(17, 30))} />);
      expect(texts("Start")).toEqual(["09", "05", "AM"]);
      expect(texts("End")).toEqual(["05", "30", "PM"]);
    });

    it("shows a second segment in both editors when asked", () => {
      render(<Field seconds defaultValue={range(LocalTime.of(9, 0, 15), LocalTime.of(17, 0, 45))} />);
      expect(texts("Start")).toEqual(["09", "00", "15"]);
      expect(texts("End")).toEqual(["17", "00", "45"]);
    });

    it("labels the virtual Enter key done on the end's last segment only", () => {
      render(<Field />);
      expect(segment("Start", "Minute")).toHaveAttribute("enterkeyhint", "next");
      expect(segment("End", "Hour")).toHaveAttribute("enterkeyhint", "next");
      expect(segment("End", "Minute")).toHaveAttribute("enterkeyhint", "done");
    });
  });

  describe("naming", () => {
    it("names each editor by the field's aria-label followed by its own label", () => {
      render(<Field />);
      expect(editor("Start").getAttribute("aria-labelledby")?.split(" ")[0]).toBe(field().id);
      expect(screen.getByRole("group", { name: "Shift Start" })).toBe(editor("Start"));
      expect(screen.getByRole("group", { name: "Shift End" })).toBe(editor("End"));
    });

    it("names each editor after the field's aria-labelledby", () => {
      render(
        <>
          <span id="caption">Opening hours</span>
          <TimeRangeField aria-labelledby="caption" locale={deDE} />
        </>,
      );
      expect(screen.getByRole("group", { name: "Opening hours" })).toHaveClass("vpg-time-range-field");
      expect(screen.getByRole("group", { name: "Opening hours Start" })).toBeInTheDocument();
      expect(screen.getByRole("group", { name: "Opening hours End" })).toBeInTheDocument();
    });

    it("names each editor by its own label alone when the field has none", () => {
      render(<TimeRangeField locale={deDE} />);
      expect(screen.getByRole("group", { name: "Start" })).toHaveAttribute("data-end", "start");
      expect(screen.getByRole("group", { name: "End" })).toHaveAttribute("data-end", "end");
    });

    it("takes its editors' own labels from startLabel and endLabel", () => {
      render(<Field startLabel="Opens" endLabel="Closes" />);
      expect(screen.getByRole("group", { name: "Shift Opens" })).toHaveAttribute("data-end", "start");
      expect(screen.getByRole("group", { name: "Shift Closes" })).toHaveAttribute("data-end", "end");
    });

    it("keeps two fields on one page apart", () => {
      render(
        <>
          <Field />
          <TimeRangeField aria-label="Break" locale={deDE} />
        </>,
      );
      expect(screen.getAllByRole("group", { name: "Shift Start" })).toHaveLength(1);
      expect(screen.getAllByRole("group", { name: "Break Start" })).toHaveLength(1);
    });
  });

  describe("FormField", () => {
    it("labels the outer group and, through it, both editors", () => {
      render(
        <FormField label="Opening hours" hint="Local time.">
          <TimeRangeField locale={deDE} />
        </FormField>,
      );
      const outer = screen.getByRole("group", { name: "Opening hours" });
      expect(outer).toHaveClass("vpg-time-range-field");
      expect(outer).toHaveAccessibleDescription("Local time.");
      expect(screen.getByRole("group", { name: "Opening hours Start" })).toHaveAttribute("data-end", "start");
      expect(screen.getByRole("group", { name: "Opening hours End" })).toHaveAttribute("data-end", "end");
    });

    it("carries FormField's error as aria-invalid on the outer group", () => {
      render(
        <FormField label="Opening hours" error="Enter the hours.">
          <TimeRangeField locale={deDE} />
        </FormField>,
      );
      expect(screen.getByRole("group", { name: "Opening hours" })).toHaveAttribute("aria-invalid", "true");
      expect(screen.getByRole("group", { name: "Opening hours Start" })).not.toHaveAttribute("aria-invalid");
    });
  });

  describe("commit", () => {
    it("commits once both ends are typed, moving on from the start's last segment to the end's first", () => {
      const onChange = vi.fn();
      render(<Field onChange={onChange} />);
      focus(segment("Start", "Hour"));
      typeKeys("0900");
      expect(document.activeElement).toBe(segment("End", "Hour"));
      expect(onChange).not.toHaveBeenCalled();
      typeKeys("1730");
      expect(onChange).toHaveBeenCalledOnce();
      expect(iso(onChange.mock.calls[0]?.[0])).toBe("09:00/17:30");
      expect(document.activeElement).toBe(segment("End", "Minute"));
      expect(field()).not.toHaveAttribute("aria-invalid");
    });

    it("commits on a 12-hour locale, AM/PM included", () => {
      const onChange = vi.fn();
      render(<TimeRangeField aria-label="Shift" locale={enUS} onChange={onChange} />);
      focus(segment("Start", "Hour"));
      typeKeys("0900a");
      expect(document.activeElement).toBe(segment("End", "Hour"));
      typeKeys("0500p");
      expect(iso(onChange.mock.calls[0]?.[0])).toBe("09:00/17:00");
    });

    it("commits equal ends", () => {
      const onChange = vi.fn();
      render(<Field onChange={onChange} />);
      focus(segment("Start", "Hour"));
      typeKeys("12001200");
      expect(iso(onChange.mock.calls[0]?.[0])).toBe("12:00/12:00");
      expect(field()).not.toHaveAttribute("aria-invalid");
    });

    it("rejects an end before the start: both editors flagged, nothing committed, nothing swapped", () => {
      const onChange = vi.fn();
      render(<Field onChange={onChange} />);
      focus(segment("Start", "Hour"));
      typeKeys("17000900");
      expect(onChange).not.toHaveBeenCalled();
      expect(editor("Start")).toHaveAttribute("aria-invalid", "true");
      expect(editor("End")).toHaveAttribute("aria-invalid", "true");
      expect(field()).toHaveAttribute("aria-invalid", "true");
      leave();
      expect(texts("Start")).toEqual(["17", "00"]);
      expect(texts("End")).toEqual(["09", "00"]);
      expect(field()).toHaveAttribute("aria-invalid", "true");
    });

    it("never wraps past midnight: a late start with an early end is rejected", () => {
      const onChange = vi.fn();
      render(<Field onChange={onChange} />);
      focus(segment("Start", "Hour"));
      typeKeys("22000200");
      expect(onChange).not.toHaveBeenCalled();
      expect(editor("Start")).toHaveAttribute("aria-invalid", "true");
      expect(editor("End")).toHaveAttribute("aria-invalid", "true");
    });

    it("commits a reversed pair once either end is corrected", () => {
      const onChange = vi.fn();
      render(<Field onChange={onChange} />);
      focus(segment("Start", "Hour"));
      typeKeys("17000900");
      focus(segment("Start", "Hour"));
      typeKeys("08");
      leave();
      expect(iso(onChange.mock.calls[0]?.[0])).toBe("08:00/09:00");
      expect(field()).not.toHaveAttribute("aria-invalid");
    });

    it("leaves a half-filled range incomplete, flagging the empty end once focus leaves the field", () => {
      const onChange = vi.fn();
      render(<Field onChange={onChange} />);
      focus(segment("Start", "Hour"));
      typeKeys("0900");
      expect(document.activeElement).toBe(segment("End", "Hour"));
      expect(field()).not.toHaveAttribute("aria-invalid");
      leave();
      expect(onChange).not.toHaveBeenCalled();
      expect(editor("Start")).not.toHaveAttribute("aria-invalid");
      expect(editor("End")).toHaveAttribute("aria-invalid", "true");
      expect(field()).toHaveAttribute("aria-invalid", "true");
      expect(texts("Start")).toEqual(["09", "00"]);
    });

    it("leaves a range with only the end filled incomplete at the start", () => {
      const onChange = vi.fn();
      render(<Field onChange={onChange} />);
      focus(segment("End", "Hour"));
      typeKeys("1700");
      leave();
      expect(onChange).not.toHaveBeenCalled();
      expect(editor("Start")).toHaveAttribute("aria-invalid", "true");
      expect(editor("End")).not.toHaveAttribute("aria-invalid");
    });

    it("holds the pair back while the other editor is partly filled", () => {
      const onChange = vi.fn();
      render(<Field onChange={onChange} defaultValue={range(time(9), time(17))} />);
      focus(segment("Start", "Minute"));
      press(segment("Start", "Minute"), "Backspace");
      focus(segment("End", "Hour"));
      expect(editor("Start")).toHaveAttribute("aria-invalid", "true");
      typeKeys("18");
      leave();
      expect(onChange).not.toHaveBeenCalled();
      expect(texts("Start")).toEqual(["09", "––"]);
      expect(texts("End")).toEqual(["18", "00"]);
      expect(field()).toHaveAttribute("aria-invalid", "true");
    });

    it("commits undefined once both editors are cleared", () => {
      const onChange = vi.fn();
      render(<Field onChange={onChange} defaultValue={range(time(9), time(17))} />);
      for (const end of ["Start", "End"] as const) {
        for (const label of ["Hour", "Minute"] as const) {
          focus(segment(end, label));
          press(segment(end, label), "Delete");
        }
      }
      expect(onChange).not.toHaveBeenCalled();
      leave();
      expect(onChange).toHaveBeenCalledExactlyOnceWith(undefined);
      expect(field()).not.toHaveAttribute("aria-invalid");
    });

    it("commits on Enter", () => {
      const onChange = vi.fn();
      render(<Field onChange={onChange} defaultValue={range(time(9), time(17))} />);
      focus(segment("End", "Hour"));
      press(segment("End", "Hour"), "ArrowUp");
      press(segment("End", "Hour"), "Enter");
      expect(iso(onChange.mock.calls[0]?.[0])).toBe("09:00/18:00");
    });

    it("reports nothing for an edit that lands back on the committed range", () => {
      const onChange = vi.fn();
      render(<Field onChange={onChange} defaultValue={range(time(9), time(17))} />);
      focus(segment("Start", "Hour"));
      press(segment("Start", "Hour"), "ArrowUp");
      press(segment("Start", "Hour"), "ArrowDown");
      leave();
      expect(onChange).not.toHaveBeenCalled();
      expect(texts("Start")).toEqual(["09", "00"]);
    });

    it("commits nothing when focus moves between the editors without an edit", () => {
      const onChange = vi.fn();
      render(<Field onChange={onChange} defaultValue={range(time(9), time(17))} />);
      focus(segment("Start", "Hour"));
      focus(segment("End", "Hour"));
      leave();
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe("arrow keys across the editors", () => {
    it("moves from the start's last segment to the end's first, and back", () => {
      render(<Field />);
      focus(segment("Start", "Minute"));
      press(segment("Start", "Minute"), "ArrowRight");
      expect(document.activeElement).toBe(segment("End", "Hour"));
      press(segment("End", "Hour"), "ArrowLeft");
      expect(document.activeElement).toBe(segment("Start", "Minute"));
    });

    it("stops at the field's outer edges", () => {
      render(<Field />);
      focus(segment("Start", "Hour"));
      press(segment("Start", "Hour"), "ArrowLeft");
      expect(document.activeElement).toBe(segment("Start", "Hour"));
      focus(segment("End", "Minute"));
      press(segment("End", "Minute"), "ArrowRight");
      expect(document.activeElement).toBe(segment("End", "Minute"));
    });

    it("follows the visual order right to left", () => {
      render(<Field style={{ direction: "rtl" }} />);
      focus(segment("Start", "Minute"));
      press(segment("Start", "Minute"), "ArrowLeft");
      expect(document.activeElement).toBe(segment("End", "Hour"));
      press(segment("End", "Hour"), "ArrowRight");
      expect(document.activeElement).toBe(segment("Start", "Minute"));
    });

    it("commits the start as it is left by an arrow", () => {
      const onChange = vi.fn();
      render(<Field onChange={onChange} defaultValue={range(time(9), time(17))} />);
      focus(segment("Start", "Minute"));
      press(segment("Start", "Minute"), "ArrowUp");
      press(segment("Start", "Minute"), "ArrowRight");
      expect(iso(onChange.mock.calls[0]?.[0])).toBe("09:01/17:00");
    });

    it("moves on from the start's last segment when a virtual keyboard fills it", () => {
      const onChange = vi.fn();
      render(<Field onChange={onChange} />);
      focus(segment("Start", "Hour"));
      const insert = (text: string) =>
        act(() => {
          (document.activeElement as HTMLElement).dispatchEvent(
            new InputEvent("beforeinput", { inputType: "insertText", data: text, bubbles: true, cancelable: true }),
          );
        });
      insert("0830");
      expect(document.activeElement).toBe(segment("End", "Hour"));
      insert("1615");
      expect(iso(onChange.mock.calls[0]?.[0])).toBe("08:30/16:15");
    });
  });

  describe("uncontrolled", () => {
    it("starts empty with no defaultValue", () => {
      render(<Field />);
      expect(texts("Start")).toEqual(["––", "––"]);
      expect(texts("End")).toEqual(["––", "––"]);
    });

    it("commits without an onChange", () => {
      const { container } = render(<Field startName="from" endName="to" />);
      focus(segment("Start", "Hour"));
      typeKeys("08001600");
      expect(hiddenInputs(container)).toEqual([
        ["from", "08:00"],
        ["to", "16:00"],
      ]);
    });
  });

  describe("controlled", () => {
    function Controlled({ initial, onChange }: { initial: TimeRange | undefined; onChange?: (range: TimeRange | undefined) => void }) {
      const [value, setValue] = useState(initial);
      return (
        <>
          <Field
            value={value}
            onChange={(next) => {
              setValue(next);
              onChange?.(next);
            }}
          />
          <button type="button" onClick={() => setValue(range(time(6), time(7)))}>
            Early
          </button>
        </>
      );
    }

    it("shows the value it is given and reports commits to the parent", () => {
      const onChange = vi.fn();
      render(<Controlled initial={range(time(9), time(17))} onChange={onChange} />);
      expect(texts("End")).toEqual(["17", "00"]);
      focus(segment("End", "Hour"));
      typeKeys("18");
      leave();
      expect(iso(onChange.mock.calls[0]?.[0])).toBe("09:00/18:00");
      expect(texts("End")).toEqual(["18", "00"]);
    });

    it("treats a value of undefined as a controlled empty field", () => {
      const onChange = vi.fn();
      render(<Field value={undefined} onChange={onChange} />);
      focus(segment("Start", "Hour"));
      typeKeys("08001600");
      expect(iso(onChange.mock.calls[0]?.[0])).toBe("08:00/16:00");
      leave();
      expect(texts("Start")).toEqual(["––", "––"]);
      expect(texts("End")).toEqual(["––", "––"]);
    });

    it("follows a controlled update while focus is outside the field, dropping a rejected pair", () => {
      render(<Controlled initial={range(time(9), time(17))} />);
      focus(segment("Start", "Hour"));
      typeKeys("18");
      leave();
      expect(field()).toHaveAttribute("aria-invalid", "true");
      fireEvent.click(screen.getByRole("button", { name: "Early" }));
      expect(texts("Start")).toEqual(["06", "00"]);
      expect(texts("End")).toEqual(["07", "00"]);
      expect(field()).not.toHaveAttribute("aria-invalid");
    });

    it("keeps an edit in progress through a controlled update, and takes the update once focus leaves", () => {
      const { rerender } = render(<Field value={range(time(9), time(17))} />);
      focus(segment("Start", "Hour"));
      typeKeys("1");
      rerender(<Field value={range(time(6), time(7))} />);
      expect(texts("Start")[0]).toBe("1");
      focus(segment("End", "Hour"));
      expect(texts("Start")).toEqual(["01", "00"]);
      leave();
      expect(texts("Start")).toEqual(["06", "00"]);
      expect(texts("End")).toEqual(["07", "00"]);
    });

    it("shows the parent's range once focus leaves when the parent declines a commit", () => {
      const onChange = vi.fn();
      render(<Field value={range(time(9), time(17))} onChange={onChange} />);
      focus(segment("End", "Hour"));
      typeKeys("18");
      leave();
      expect(iso(onChange.mock.calls[0]?.[0])).toBe("09:00/18:00");
      expect(texts("End")).toEqual(["17", "00"]);
    });

    it("flags both ends of a reversed value it is given, and never corrects it", () => {
      render(<Field value={range(time(17), time(9))} />);
      expect(editor("Start")).toHaveAttribute("aria-invalid", "true");
      expect(editor("End")).toHaveAttribute("aria-invalid", "true");
      expect(texts("Start")).toEqual(["17", "00"]);
    });
  });

  describe("min and max", () => {
    const bounds = { min: time(8), max: time(18) };

    it("rejects a typed end outside the bounds, flagging that editor and committing nothing", () => {
      const onChange = vi.fn();
      render(<Field {...bounds} onChange={onChange} defaultValue={range(time(9), time(17))} />);
      focus(segment("End", "Hour"));
      typeKeys("19");
      leave();
      expect(onChange).not.toHaveBeenCalled();
      expect(editor("End")).toHaveAttribute("aria-invalid", "true");
      expect(editor("Start")).not.toHaveAttribute("aria-invalid");
      expect(texts("End")).toEqual(["19", "00"]);
    });

    it("holds the pair back while the other editor is out of bounds", () => {
      const onChange = vi.fn();
      render(<Field {...bounds} onChange={onChange} defaultValue={range(time(9), time(17))} />);
      focus(segment("Start", "Hour"));
      typeKeys("07");
      focus(segment("End", "Hour"));
      typeKeys("16");
      leave();
      expect(onChange).not.toHaveBeenCalled();
      expect(editor("Start")).toHaveAttribute("aria-invalid", "true");
    });

    it("refuses an arrow step past a bound", () => {
      render(<Field {...bounds} defaultValue={range(time(8), time(18))} />);
      focus(segment("Start", "Hour"));
      press(segment("Start", "Hour"), "ArrowDown");
      expect(texts("Start")).toEqual(["08", "00"]);
    });

    it("flags a value outside the bounds and never corrects it", () => {
      render(<Field {...bounds} defaultValue={range(time(7), time(17))} />);
      expect(editor("Start")).toHaveAttribute("aria-invalid", "true");
      expect(editor("End")).not.toHaveAttribute("aria-invalid");
      expect(field()).toHaveAttribute("aria-invalid", "true");
    });

    it("commits a rejected end once the bounds change to take it in", () => {
      const onChange = vi.fn();
      const { rerender } = render(<Field {...bounds} onChange={onChange} defaultValue={range(time(9), time(17))} />);
      focus(segment("End", "Hour"));
      typeKeys("19");
      leave();
      rerender(<Field min={time(8)} max={time(20)} onChange={onChange} defaultValue={range(time(9), time(17))} />);
      expect(iso(onChange.mock.calls[0]?.[0])).toBe("09:00/19:00");
    });
  });

  describe("form participation", () => {
    it("carries each named end's ISO time on its own hidden input, never on the segments", () => {
      const { container } = render(<Field startName="from" endName="to" defaultValue={range(time(9), LocalTime.of(17, 30, 15))} seconds />);
      expect(hiddenInputs(container)).toEqual([
        ["from", "09:00"],
        ["to", "17:30:15"],
      ]);
      expect(container.querySelectorAll("[name]")).toHaveLength(2);
    });

    it("renders no hidden input for an end with no name", () => {
      const { container, rerender } = render(<Field defaultValue={range(time(9), time(17))} />);
      expect(hiddenInputs(container)).toEqual([]);
      rerender(<Field endName="to" defaultValue={range(time(9), time(17))} />);
      expect(hiddenInputs(container)).toEqual([["to", "17:00"]]);
    });

    it("carries empty values for no range, and keeps the committed range while the pair is rejected", () => {
      const { container } = render(<Field startName="from" endName="to" />);
      expect(hiddenInputs(container)).toEqual([
        ["from", ""],
        ["to", ""],
      ]);
      focus(segment("Start", "Hour"));
      typeKeys("17000900");
      expect(hiddenInputs(container)).toEqual([
        ["from", ""],
        ["to", ""],
      ]);
    });

    it("submits both ends with the form", () => {
      const { container } = render(
        <form>
          <Field startName="from" endName="to" defaultValue={range(time(9), time(17))} />
        </form>,
      );
      const data = new FormData(container.querySelector("form") as HTMLFormElement);
      expect(data.get("from")).toBe("09:00");
      expect(data.get("to")).toBe("17:00");
    });
  });

  describe("disabled", () => {
    it("marks the groups, takes every segment out of the tab order and disables the hidden inputs", () => {
      const { container } = render(<Field disabled startName="from" endName="to" defaultValue={range(time(9), time(17))} />);
      expect(field()).toHaveAttribute("aria-disabled", "true");
      expect(editor("Start")).toHaveAttribute("aria-disabled", "true");
      for (const element of screen.getAllByRole("spinbutton")) {
        expect(element).toHaveAttribute("tabindex", "-1");
      }
      for (const input of container.querySelectorAll("input")) {
        expect(input).toBeDisabled();
      }
    });

    it("ignores keys", () => {
      const onChange = vi.fn();
      render(<Field disabled onChange={onChange} defaultValue={range(time(9), time(17))} />);
      focus(segment("Start", "Minute"));
      press(segment("Start", "Minute"), "ArrowUp");
      press(segment("Start", "Minute"), "ArrowRight");
      expect(texts("Start")).toEqual(["09", "00"]);
      expect(document.activeElement).toBe(segment("Start", "Minute"));
    });
  });

  describe("pressing the field", () => {
    it("makes both editors' segments editable once a touch presses the field", () => {
      render(<Field />);
      fireEvent.pointerDown(field(), { pointerType: "mouse" });
      expect(segment("End", "Hour")).toHaveAttribute("contenteditable", "false");
      fireEvent.pointerDown(segment("Start", "Hour"), { pointerType: "touch" });
      for (const element of screen.getAllByRole("spinbutton")) {
        expect(element).toHaveAttribute("contenteditable", "true");
      }
    });

    it("focuses the start's first empty segment from the separator or the shell's padding", () => {
      render(<Field />);
      const separator = field().querySelector(".vpg-time-range-field-separator") as HTMLElement;
      for (const target of [separator, field().parentElement as HTMLElement]) {
        leave();
        expect(fireEvent.mouseDown(target)).toBe(false);
        fireEvent.click(target);
        expect(document.activeElement).toBe(segment("Start", "Hour"));
      }
    });

    it("focuses the end's first empty segment from a press inside the end editor", () => {
      render(<Field defaultValue={range(time(9), time(17))} />);
      focus(segment("End", "Minute"));
      press(segment("End", "Minute"), "Backspace");
      leave();
      fireEvent.click(editor("End").querySelector(".vpg-time-field-literal") as HTMLElement);
      expect(document.activeElement).toBe(segment("End", "Minute"));
    });
  });

  describe("focus handlers", () => {
    it("calls the caller's focus and blur handlers on the outer group, blur only as focus leaves the field", () => {
      const onFocus = vi.fn();
      const onBlur = vi.fn();
      render(
        <>
          <Field onFocus={onFocus} onBlur={onBlur} />
          <button type="button">After</button>
        </>,
      );
      focus(segment("Start", "Hour"));
      focus(segment("End", "Hour"));
      expect(onFocus).toHaveBeenCalled();
      focus(screen.getByRole("button", { name: "After" }));
      expect(onBlur).toHaveBeenCalled();
      expect(onBlur.mock.calls.at(-1)?.[0].relatedTarget).toBe(screen.getByRole("button", { name: "After" }));
    });
  });
});
