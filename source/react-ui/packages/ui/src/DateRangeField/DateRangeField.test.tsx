import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { LocaleProvider } from "@vipengele/react-tokens";
import { Locale, LocalDate } from "@vipengele/ts";
import { createRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { FormField } from "../FormField/FormField.js";
import type { DateRange } from "../internal/localRange.js";
import { DateRangeField, type DateRangeFieldProps } from "./DateRangeField.js";

// Every test passes a locale and a fixed `today` unless it is about the defaults, so nothing
// depends on the machine's locale or the day the suite runs.
const enUS = new Locale("en-US");
const deDE = new Locale("de-DE");
const date = (year: number, month: number, day: number) => LocalDate.of(year, month, day);
const range = (start: LocalDate, end: LocalDate): DateRange => ({ start, end });
const TODAY = date(2026, 10, 14);
const OCTOBER = range(date(2026, 10, 5), date(2026, 10, 9));

function renderField(props: Partial<DateRangeFieldProps> = {}) {
  return render(<DateRangeField aria-label="Stay" locale={enUS} today={TODAY} {...props} />);
}

const group = () => screen.getByRole("group") as HTMLElement;
const start = () => screen.getByRole("textbox", { name: "Stay Start" }) as HTMLInputElement;
const end = () => screen.getByRole("textbox", { name: "Stay End" }) as HTMLInputElement;
/** The inputs carrying the form values. They have no role, so no query in `screen` reaches them. */
const hiddenInputs = (container: HTMLElement) => [...container.querySelectorAll("input")].filter((input) => input.type === "hidden");
const hiddenNamed = (container: HTMLElement, name: string) =>
  hiddenInputs(container).find((input) => input.name === name) as HTMLInputElement;
const clearButton = (name = "Clear dates") => screen.getByRole("button", { name });
const queryClearButton = () => screen.queryByRole("button", { name: "Clear dates" });
const toggle = () => document.querySelector(".vpg-date-range-field-calendar-toggle") as HTMLButtonElement;
const panel = () => document.querySelector(".vpg-date-range-field-panel");
/** A day of the open calendar, by its ISO date. */
const day = (value: LocalDate) => document.querySelector(`[data-date="${value.toString()}"]`) as HTMLElement;
const heading = () => (document.querySelector(".vpg-calendar-heading") as HTMLElement).textContent;

/** Real focus, not a synthesised event: focus moves are asserted against `activeElement`. */
const focus = (element: HTMLElement) => act(() => element.focus());
const blur = (element: HTMLElement) => act(() => element.blur());
const type = (element: HTMLElement, text: string) => fireEvent.change(element, { target: { value: text } });
/** Focuses `element`, replaces its text with `text` and leaves it for the other editor. */
function fill(element: HTMLInputElement, text: string) {
  focus(element);
  type(element, text);
}
/** Puts the caret at `offset` in `element` and presses `key` there. */
const pressAt = (element: HTMLInputElement, offset: number, key: "ArrowUp" | "ArrowDown") => {
  element.setSelectionRange(offset, offset);
  return fireEvent.keyDown(element, { key });
};

describe("DateRangeField", () => {
  describe("structure", () => {
    it("renders two text editors in a group marked as the shell's growing control", () => {
      renderField({ className: "custom" });
      expect(group()).toHaveClass("vpg-date-range-field", "vpg-field-shell-control", "custom");
      expect(group().parentElement).toHaveClass("vpg-field-shell");
      for (const editor of [start(), end()]) {
        expect(editor).toHaveAttribute("type", "text");
        expect(editor).toHaveAttribute("autocomplete", "off");
        expect(editor).not.toHaveAttribute("name");
        expect(editor).toHaveAttribute("placeholder", "mm/dd/yyyy");
        expect(editor).toHaveAttribute("aria-description", "Format: month / day / year");
      }
    });

    it("forwards arbitrary attributes and the ref to the group", () => {
      const ref = createRef<HTMLDivElement>();
      renderField({ id: "stay", ref, "data-testid": "root" } as Partial<DateRangeFieldProps>);
      expect(group()).toHaveAttribute("id", "stay");
      expect(group()).toHaveAttribute("data-testid", "root");
      expect(ref.current).toBe(group());
    });

    it("injects its stylesheet once for any number of fields", () => {
      render(
        <>
          <DateRangeField aria-label="Stay" />
          <DateRangeField aria-label="Trip" />
        </>,
      );
      const styles = document.head.querySelectorAll('style[data-href="vpg-date-range-field"]');
      expect(styles).toHaveLength(1);
      expect(styles[0]?.textContent).toContain(".vpg-date-range-field {");
    });

    it("never assigns a --vpg-* custom property inline", () => {
      renderField({ defaultValue: OCTOBER });
      for (const element of [group(), start(), end(), clearButton(), toggle()]) {
        expect(element.getAttribute("style") ?? "").not.toContain("--vpg-");
      }
    });

    it("shows the committed range in the locale's numeric pattern", () => {
      renderField({ defaultValue: OCTOBER });
      expect(start()).toHaveValue("10/05/2026");
      expect(end()).toHaveValue("10/09/2026");
    });

    it("sizes each editor to the longer of its text and its placeholder, inside a shell that shrink-wraps them", () => {
      renderField({ defaultValue: OCTOBER });
      expect(group().parentElement).toHaveClass("vpg-field-shell", "vpg-date-range-field-shell");
      expect(start().style.width).toBe("10ch");
      fill(start(), "the fifth of October");
      expect(start().style.width).toBe("20ch");
      fill(end(), "");
      expect(end().style.width).toBe("10ch");
    });
  });

  describe("naming", () => {
    it("names each editor by the group's aria-label and its own label", () => {
      renderField();
      expect(group()).toHaveAccessibleName("Stay");
      expect(start()).toHaveAccessibleName("Stay Start");
      expect(end()).toHaveAccessibleName("Stay End");
    });

    it("names each editor by the ids the group is labelled by", () => {
      render(
        <>
          <span id="caption">Trip</span>
          <DateRangeField aria-labelledby="caption" locale={enUS} />
        </>,
      );
      expect(group()).toHaveAccessibleName("Trip");
      expect(screen.getByRole("textbox", { name: "Trip Start" })).toBeInTheDocument();
      expect(screen.getByRole("textbox", { name: "Trip End" })).toBeInTheDocument();
    });

    it("names each editor by its own label alone when the group has none", () => {
      render(<DateRangeField locale={enUS} />);
      expect(screen.getByRole("textbox", { name: "Start" })).toBeInTheDocument();
      expect(screen.getByRole("textbox", { name: "End" })).toBeInTheDocument();
    });

    it("takes the editors' own labels from startLabel and endLabel", () => {
      renderField({ startLabel: "Check-in", endLabel: "Check-out" });
      expect(screen.getByRole("textbox", { name: "Stay Check-in" })).toBeInTheDocument();
      expect(screen.getByRole("textbox", { name: "Stay Check-out" })).toBeInTheDocument();
    });

    it("keeps two range fields on one page apart", () => {
      render(
        <>
          <DateRangeField aria-label="Stay" locale={enUS} />
          <DateRangeField aria-label="Trip" locale={enUS} />
        </>,
      );
      expect(screen.getByRole("textbox", { name: "Stay Start" })).not.toBe(screen.getByRole("textbox", { name: "Trip Start" }));
    });

    it("takes FormField's label, description and invalid state on the group", () => {
      render(
        <FormField label="Holiday" hint="Weekdays only." error="Pick both days.">
          <DateRangeField locale={enUS} />
        </FormField>,
      );
      expect(group()).toHaveAccessibleName("Holiday");
      expect(group()).toHaveAccessibleDescription("Weekdays only. Pick both days.");
      expect(group()).toHaveAttribute("aria-invalid", "true");
      expect(screen.getByRole("textbox", { name: "Holiday Start" })).toBeInTheDocument();
      expect(screen.getByRole("textbox", { name: "Holiday End" })).toBeInTheDocument();
    });
  });

  describe("composition", () => {
    const ko = new Locale("ko-KR");

    for (const [name, editor] of [
      ["start", start],
      ["end", end],
    ] as const) {
      it(`keeps the ${name} editor's raw text while composing and applies the rule once, from the text the composition began on`, () => {
        renderField({ locale: ko });
        focus(editor());
        type(editor(), "2026. 1");
        fireEvent.compositionStart(editor());
        fireEvent.input(editor(), { target: { value: "2026. 10" }, isComposing: true });
        expect(editor().value).toBe("2026. 10");
        fireEvent.compositionEnd(editor());
        expect(editor().value).toBe("2026. 10. ");
      });
    }

    it("leaves the other editor's text alone", () => {
      renderField({ locale: ko });
      fill(end(), "2026. 12. 1");
      focus(start());
      type(start(), "2026. 1");
      fireEvent.compositionStart(start());
      fireEvent.input(start(), { target: { value: "2026. 10" }, isComposing: true });
      fireEvent.compositionEnd(start());
      expect(end().value).toBe("2026. 12. 1");
    });
  });

  describe("committing", () => {
    it("commits a typed range once both ends are in, never per keystroke", () => {
      const onChange = vi.fn();
      renderField({ onChange });

      fill(start(), "10/01/2026");
      fill(end(), "10/20/2026");
      expect(onChange).not.toHaveBeenCalled();
      blur(end());
      expect(onChange.mock.calls).toEqual([[range(date(2026, 10, 1), date(2026, 10, 20))]]);
      expect(start()).toHaveValue("10/01/2026");
      expect(end()).toHaveValue("10/20/2026");
      expect(group()).not.toHaveAttribute("aria-invalid");
    });

    it("commits on Enter, with the form values in the DOM before Enter's own handler returns", () => {
      let during: string[] = [];
      const onChange = vi.fn();
      const { container } = render(
        <form>
          <DateRangeField
            aria-label="Stay"
            locale={enUS}
            startName="from"
            endName="to"
            onChange={onChange}
            onKeyDown={() => {
              during = hiddenInputs(container).map((input) => input.value);
            }}
          />
        </form>,
      );

      fill(start(), "10/01/2026");
      fill(end(), "10/20/2026");
      expect(fireEvent.keyDown(end(), { key: "Enter" })).toBe(true);
      expect(onChange).toHaveBeenCalledWith(range(date(2026, 10, 1), date(2026, 10, 20)));
      expect(during).toEqual(["2026-10-01", "2026-10-20"]);
    });

    it("ignores an Enter that ends an IME composition", () => {
      const onChange = vi.fn();
      renderField({ onChange });
      fill(start(), "10/01/2026");
      fill(end(), "10/20/2026");
      fireEvent.keyDown(end(), { key: "Enter", isComposing: true });
      expect(onChange).not.toHaveBeenCalled();
    });

    it("commits an edit of one end against the other's committed date", () => {
      const onChange = vi.fn();
      renderField({ defaultValue: OCTOBER, onChange });
      fill(end(), "10/12/2026");
      blur(end());
      expect(onChange.mock.calls).toEqual([[range(date(2026, 10, 5), date(2026, 10, 12))]]);
    });

    it("commits equal ends as a one-day range", () => {
      const onChange = vi.fn();
      renderField({ onChange });
      fill(start(), "10/05/2026");
      fill(end(), "10/05/2026");
      blur(end());
      expect(onChange).toHaveBeenCalledWith(range(date(2026, 10, 5), date(2026, 10, 5)));
    });

    it("decides nothing again when focus moves between the editors with no edit", () => {
      const onChange = vi.fn();
      renderField({ defaultValue: OCTOBER, onChange });
      focus(start());
      focus(end());
      blur(end());
      expect(onChange).not.toHaveBeenCalled();
    });

    it("rejects an end before the start: both flagged, nothing committed, the texts kept", () => {
      const onChange = vi.fn();
      const { container } = renderField({ defaultValue: OCTOBER, startName: "from", endName: "to", onChange });
      fill(start(), "10/20/2026");
      fill(end(), "10/01/2026");
      blur(end());
      expect(onChange).not.toHaveBeenCalled();
      expect(start()).toHaveValue("10/20/2026");
      expect(end()).toHaveValue("10/01/2026");
      expect(start()).toHaveAttribute("aria-invalid", "true");
      expect(end()).toHaveAttribute("aria-invalid", "true");
      expect(group()).toHaveAttribute("aria-invalid", "true");
      expect(hiddenNamed(container, "from")).toHaveValue("2026-10-05");
      expect(hiddenNamed(container, "to")).toHaveValue("2026-10-09");
    });

    it("commits once a reversed range is put in order", () => {
      const onChange = vi.fn();
      renderField({ onChange });
      fill(start(), "10/20/2026");
      fill(end(), "10/01/2026");
      fill(start(), "09/20/2026");
      blur(start());
      expect(onChange.mock.calls).toEqual([[range(date(2026, 9, 20), date(2026, 10, 1))]]);
      expect(group()).not.toHaveAttribute("aria-invalid");
    });

    it("flags only the editor whose text reads as no accepted date", () => {
      const onChange = vi.fn();
      renderField({ min: date(2026, 10, 1), onChange });
      fill(start(), "09/01/2026");
      fill(end(), "10/05/2026");
      blur(end());
      expect(onChange).not.toHaveBeenCalled();
      expect(start()).toHaveAttribute("aria-invalid", "true");
      expect(end()).not.toHaveAttribute("aria-invalid");
      expect(group()).toHaveAttribute("aria-invalid", "true");
    });

    it("holds a half-filled range as incomplete, flagged only once focus has left the field", () => {
      const onChange = vi.fn();
      renderField({ onChange });
      fill(start(), "10/01/2026");
      focus(end());
      expect(group()).not.toHaveAttribute("aria-invalid");
      blur(end());
      expect(onChange).not.toHaveBeenCalled();
      expect(start()).toHaveValue("10/01/2026");
      expect(start()).not.toHaveAttribute("aria-invalid");
      expect(end()).toHaveAttribute("aria-invalid", "true");
      expect(group()).toHaveAttribute("aria-invalid", "true");
    });

    it("keeps the committed range when the field is left half-filled", () => {
      const onChange = vi.fn();
      const { container } = renderField({ defaultValue: OCTOBER, startName: "from", onChange });
      fill(start(), "");
      blur(start());
      expect(onChange).not.toHaveBeenCalled();
      expect(start()).toHaveValue("");
      expect(start()).toHaveAttribute("aria-invalid", "true");
      expect(hiddenNamed(container, "from")).toHaveValue("2026-10-05");
    });

    it("commits two emptied editors as no range", () => {
      const onChange = vi.fn();
      const { container } = renderField({ defaultValue: OCTOBER, startName: "from", endName: "to", onChange });
      fill(start(), "");
      fill(end(), " ");
      blur(end());
      expect(onChange.mock.calls).toEqual([[undefined]]);
      expect(start()).toHaveValue("");
      expect(end()).toHaveValue("");
      expect(group()).not.toHaveAttribute("aria-invalid");
      expect(hiddenNamed(container, "from")).toHaveValue("");
      expect(hiddenNamed(container, "to")).toHaveValue("");
    });

    it("adds the separator as a day or month is typed", () => {
      renderField();
      focus(start());
      type(start(), "1");
      type(start(), "10");
      expect(start()).toHaveValue("10/");
    });

    it("reads each end in the locale's pattern", () => {
      const onChange = vi.fn();
      render(<DateRangeField aria-label="Stay" locale={deDE} onChange={onChange} />);
      fill(start(), "01.10.2026");
      fill(end(), "2026-10-20");
      blur(end());
      expect(onChange).toHaveBeenCalledWith(range(date(2026, 10, 1), date(2026, 10, 20)));
      expect(end()).toHaveValue("20.10.2026");
    });
  });

  describe("stepping", () => {
    it("steps the segment under the caret and commits a complete range", () => {
      const onChange = vi.fn();
      renderField({ defaultValue: OCTOBER, onChange });
      focus(end());
      pressAt(end(), 4, "ArrowUp");
      expect(onChange).toHaveBeenLastCalledWith(range(date(2026, 10, 5), date(2026, 10, 10)));
      expect(end()).toHaveValue("10/10/2026");
      expect([end().selectionStart, end().selectionEnd]).toEqual([3, 5]);
    });

    it("rejects a step that takes the start past the end", () => {
      const onChange = vi.fn();
      renderField({ defaultValue: range(date(2026, 10, 5), date(2026, 10, 5)), onChange });
      focus(start());
      pressAt(start(), 4, "ArrowUp");
      expect(onChange).not.toHaveBeenCalled();
      expect(start()).toHaveValue("10/06/2026");
      expect(start()).toHaveAttribute("aria-invalid", "true");
    });

    it("steps an empty editor onto today without committing a half range", () => {
      const onChange = vi.fn();
      renderField({ onChange });
      focus(start());
      pressAt(start(), 0, "ArrowDown");
      expect(start()).toHaveValue("10/14/2026");
      expect(onChange).not.toHaveBeenCalled();
    });

    it("steps onto the real today when none is given", () => {
      render(<DateRangeField aria-label="Stay" locale={enUS} />);
      focus(start());
      pressAt(start(), 0, "ArrowUp");
      expect(start()).toHaveValue(LocalDate.now().format(enUS));
    });

    it("steps nothing while the text names no segment, or onto no accepted date", () => {
      const onChange = vi.fn();
      renderField({ defaultValue: OCTOBER, isDateDisabled: () => true, onChange });
      focus(end());
      expect(pressAt(end(), 4, "ArrowUp")).toBe(false);
      type(end(), "10/14");
      expect(pressAt(end(), 2, "ArrowUp")).toBe(false);
      expect(onChange).not.toHaveBeenCalled();
    });

    it("places no selection when the editor does not take the stepped date", () => {
      // Unfocused and controlled, the editors show the parent's range, and this parent empties it.
      function Emptying() {
        const [stay, setStay] = useState<DateRange | undefined>(OCTOBER);
        return <DateRangeField aria-label="Stay" locale={enUS} value={stay} onChange={() => setStay(undefined)} />;
      }
      render(<Emptying />);
      pressAt(end(), 4, "ArrowUp");
      expect(end()).toHaveValue("");
      expect([end().selectionStart, end().selectionEnd]).toEqual([0, 0]);
    });

    it("leaves every other key alone, and steps nothing in a read-only field", () => {
      const onChange = vi.fn();
      const { rerender } = renderField({ defaultValue: OCTOBER, onChange });
      expect(fireEvent.keyDown(start(), { key: "ArrowLeft" })).toBe(true);
      rerender(<DateRangeField aria-label="Stay" locale={enUS} today={TODAY} defaultValue={OCTOBER} onChange={onChange} readOnly />);
      focus(start());
      expect(pressAt(start(), 4, "ArrowUp")).toBe(true);
      expect(start()).toHaveValue("10/05/2026");
      expect(start()).toHaveAttribute("readonly");
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe("clear button", () => {
    it("is absent while both editors are empty", () => {
      renderField();
      expect(queryClearButton()).toBeNull();
    });

    it("is present while either editor holds text", () => {
      renderField();
      fill(end(), "10/");
      expect(clearButton().closest(".vpg-field-shell-trailing")).not.toBeNull();
    });

    it("empties both editors, commits no range once and focuses the start editor", () => {
      const onChange = vi.fn();
      const { container } = renderField({ defaultValue: OCTOBER, startName: "from", onChange });
      fill(end(), "soon");
      blur(end());
      expect(end()).toHaveAttribute("aria-invalid", "true");

      fireEvent.click(clearButton());
      expect(onChange.mock.calls).toEqual([[undefined]]);
      expect(start()).toHaveValue("");
      expect(end()).toHaveValue("");
      expect(group()).not.toHaveAttribute("aria-invalid");
      expect(hiddenNamed(container, "from")).toHaveValue("");
      expect(document.activeElement).toBe(start());
      expect(queryClearButton()).toBeNull();
    });

    it("clears a controlled field to what the parent stores", () => {
      function Controlled() {
        const [stay, setStay] = useState<DateRange | undefined>(OCTOBER);
        return <DateRangeField aria-label="Stay" locale={enUS} value={stay} onChange={setStay} />;
      }
      render(<Controlled />);
      fireEvent.click(clearButton());
      expect(start()).toHaveValue("");
      expect(end()).toHaveValue("");
    });

    it("stops a press from moving focus, and takes its name from clearLabel", () => {
      renderField({ defaultValue: OCTOBER, clearLabel: "Daten löschen" });
      expect(fireEvent.mouseDown(clearButton("Daten löschen"))).toBe(false);
    });

    it("is absent from a disabled or read-only field", () => {
      const { rerender } = renderField({ defaultValue: OCTOBER, disabled: true });
      expect(queryClearButton()).toBeNull();
      rerender(<DateRangeField aria-label="Stay" locale={enUS} defaultValue={OCTOBER} readOnly />);
      expect(queryClearButton()).toBeNull();
    });
  });

  describe("controlled", () => {
    it("leaves an edit in progress alone when the value changes", () => {
      const { rerender } = renderField({ value: OCTOBER });
      fill(start(), "10/2");
      rerender(<DateRangeField aria-label="Stay" locale={enUS} value={range(date(2026, 1, 1), date(2026, 1, 2))} />);
      expect(start()).toHaveValue("10/2");
      expect(end()).toHaveValue("10/09/2026");
    });

    it("shows the new value once focus has left", () => {
      const { rerender } = renderField({ value: OCTOBER });
      rerender(<DateRangeField aria-label="Stay" locale={enUS} value={range(date(2026, 1, 1), date(2026, 1, 2))} />);
      expect(start()).toHaveValue("01/01/2026");
      expect(end()).toHaveValue("01/02/2026");
    });

    it("reverts to the range the parent kept when a commit is not adopted, and reports it once", () => {
      const onChange = vi.fn();
      renderField({ value: OCTOBER, onChange });
      fill(end(), "10/20/2026");
      focus(start());
      blur(start());
      expect(onChange.mock.calls).toEqual([[range(date(2026, 10, 5), date(2026, 10, 20))]]);
      expect(end()).toHaveValue("10/09/2026");
    });

    it("adopts what a parent stores", () => {
      function Controlled() {
        const [stay, setStay] = useState<DateRange | undefined>(OCTOBER);
        return <DateRangeField aria-label="Stay" locale={enUS} value={stay} onChange={setStay} />;
      }
      render(<Controlled />);
      fill(end(), "2026-12-01");
      blur(end());
      expect(end()).toHaveValue("12/01/2026");
    });

    it("clears a stuck invalid flag once a parent moves the value on", () => {
      const { rerender } = renderField({ value: OCTOBER });
      fill(start(), "soon");
      blur(start());
      expect(group()).toHaveAttribute("aria-invalid", "true");

      rerender(<DateRangeField aria-label="Stay" locale={enUS} value={range(date(2026, 1, 1), date(2026, 1, 2))} />);
      expect(start()).toHaveValue("01/01/2026");
      expect(group()).not.toHaveAttribute("aria-invalid");
    });

    it("keeps the flag when a parent passes an equal range again", () => {
      const { rerender } = renderField({ value: OCTOBER });
      fill(start(), "soon");
      blur(start());
      rerender(<DateRangeField aria-label="Stay" locale={enUS} value={range(date(2026, 10, 5), date(2026, 10, 9))} />);
      expect(start()).toHaveValue("soon");
      expect(group()).toHaveAttribute("aria-invalid", "true");
    });

    it("is controlled and empty with value={undefined}", () => {
      const onChange = vi.fn();
      renderField({ value: undefined, defaultValue: OCTOBER, onChange });
      expect(start()).toHaveValue("");
      fill(start(), "10/01/2026");
      fill(end(), "10/02/2026");
      blur(end());
      expect(onChange).toHaveBeenCalledWith(range(date(2026, 10, 1), date(2026, 10, 2)));
      expect(start()).toHaveValue("");
    });
  });

  describe("invalid", () => {
    it("flags each end of a committed value outside the bounds", () => {
      renderField({ value: range(date(2025, 1, 1), date(2026, 10, 2)), min: date(2026, 1, 1) });
      expect(start()).toHaveAttribute("aria-invalid", "true");
      expect(end()).not.toHaveAttribute("aria-invalid");
      expect(group()).toHaveAttribute("aria-invalid", "true");
    });

    it("flags both ends of a committed value that runs backwards", () => {
      renderField({ value: range(date(2026, 10, 9), date(2026, 10, 5)) });
      expect(start()).toHaveAttribute("aria-invalid", "true");
      expect(end()).toHaveAttribute("aria-invalid", "true");
    });

    it("honours a caller's own aria-invalid on the group", () => {
      renderField({ defaultValue: OCTOBER, "aria-invalid": true });
      expect(group()).toHaveAttribute("aria-invalid", "true");
      expect(start()).not.toHaveAttribute("aria-invalid");
    });
  });

  describe("disabled, read-only and required", () => {
    it("disables both editors and states it on the group", () => {
      renderField({ disabled: true });
      expect(start()).toBeDisabled();
      expect(end()).toBeDisabled();
      expect(group()).toHaveAttribute("aria-disabled", "true");
    });

    it("marks both editors required", () => {
      renderField({ required: true });
      expect(start()).toBeRequired();
      expect(end()).toBeRequired();
    });
  });

  describe("hidden inputs", () => {
    it("renders none without startName or endName", () => {
      const { container } = renderField({ defaultValue: OCTOBER });
      expect(hiddenInputs(container)).toHaveLength(0);
    });

    it("carries each named end as an ISO 8601 date", () => {
      const { container } = renderField({ defaultValue: OCTOBER, startName: "from", endName: "to" });
      expect(hiddenNamed(container, "from")).toHaveValue("2026-10-05");
      expect(hiddenNamed(container, "to")).toHaveValue("2026-10-09");
    });

    it("renders only the end that is named", () => {
      const { container } = renderField({ defaultValue: OCTOBER, endName: "to" });
      expect(hiddenInputs(container).map((input) => input.name)).toEqual(["to"]);
    });

    it("carries nothing when there is no range", () => {
      const { container } = renderField({ startName: "from", endName: "to" });
      expect(hiddenInputs(container).map((input) => input.value)).toEqual(["", ""]);
    });

    it("is disabled with the field", () => {
      const { container } = renderField({ defaultValue: OCTOBER, startName: "from", endName: "to", disabled: true });
      for (const input of hiddenInputs(container)) expect(input).toBeDisabled();
    });
  });

  describe("locale", () => {
    it("formats at the nearest provider's locale", () => {
      render(
        <LocaleProvider locale={deDE}>
          <DateRangeField aria-label="Stay" value={OCTOBER} />
        </LocaleProvider>,
      );
      expect(start()).toHaveValue("05.10.2026");
      expect(start()).toHaveAttribute("placeholder", "dd.mm.yyyy");
    });
  });

  describe("handlers", () => {
    it("calls a caller's focus and blur handlers as focus enters and leaves the group", () => {
      const onFocus = vi.fn();
      const onBlur = vi.fn();
      render(
        <>
          <DateRangeField aria-label="Stay" locale={enUS} onFocus={onFocus} onBlur={onBlur} />
          <button type="button">After</button>
        </>,
      );
      focus(start());
      focus(end());
      focus(screen.getByRole("button", { name: "After" }));
      expect(onFocus).toHaveBeenCalledTimes(2);
      expect(onBlur).toHaveBeenCalledTimes(2);
    });
  });

  describe("calendar pop-up", () => {
    it("opens a RangeCalendar from a button at the field's start", () => {
      renderField();
      expect(toggle()).toHaveAccessibleName("Choose dates");
      expect(toggle().closest(".vpg-field-shell-leading")).not.toBeNull();
      expect(toggle()).toHaveAttribute("aria-expanded", "false");
      fireEvent.click(toggle());
      expect(panel()).toContainElement(screen.getByRole("grid"));
      expect(panel()?.querySelector(".vpg-range-calendar")).not.toBeNull();
      expect(toggle()).toHaveAttribute("aria-expanded", "true");
      expect(screen.queryByRole("dialog")).toBeNull();
    });

    it("names its button and the calendar's month buttons from their label props", () => {
      renderField({ openCalendarLabel: "Daten wählen", previousMonthLabel: "Voriger Monat", nextMonthLabel: "Nächster Monat" });
      expect(toggle()).toHaveAccessibleName("Daten wählen");
      fireEvent.click(toggle());
      expect(screen.getByRole("button", { name: "Voriger Monat" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Nächster Monat" })).toBeInTheDocument();
    });

    it("shows the committed range and passes the bounds and disabled dates through", () => {
      renderField({ defaultValue: OCTOBER, min: date(2026, 10, 2), isDateDisabled: (d) => d.day === 20 });
      fireEvent.click(toggle());
      expect(heading()).toBe("October 2026");
      expect(day(date(2026, 10, 5))).toHaveAttribute("aria-selected", "true");
      expect(day(date(2026, 10, 9))).toHaveAttribute("aria-selected", "true");
      expect(day(date(2026, 10, 7))).toHaveAttribute("data-in-range");
      expect(day(date(2026, 10, 1))).toHaveAttribute("aria-disabled", "true");
      expect(day(date(2026, 10, 20))).toHaveAttribute("aria-disabled", "true");
    });

    it("fills the start on the first pick and stays open; commits and closes on the second", async () => {
      const onChange = vi.fn();
      const onOpenChange = vi.fn();
      const { container } = renderField({ startName: "from", endName: "to", onChange, onOpenChange });
      fireEvent.click(toggle());

      fireEvent.click(day(date(2026, 10, 12)));
      expect(start()).toHaveValue("10/12/2026");
      expect(end()).toHaveValue("");
      expect(onChange).not.toHaveBeenCalled();
      expect(panel()).not.toBeNull();
      expect(day(date(2026, 10, 12))).toHaveAttribute("aria-selected", "true");
      // The field is incomplete, but not flagged while the calendar is still open.
      expect(group()).not.toHaveAttribute("aria-invalid");

      fireEvent.click(day(date(2026, 10, 16)));
      expect(onChange.mock.calls).toEqual([[range(date(2026, 10, 12), date(2026, 10, 16))]]);
      expect(onOpenChange.mock.calls).toEqual([[true], [false]]);
      await waitFor(() => expect(panel()).toBeNull());
      expect(end()).toHaveValue("10/16/2026");
      expect(hiddenNamed(container, "to")).toHaveValue("2026-10-16");
      await waitFor(() => expect(document.activeElement).toBe(end()));
    });

    it("re-anchors on a pick after a complete range, emptying the end until the second pick", () => {
      const onChange = vi.fn();
      renderField({ defaultValue: OCTOBER, onChange });
      fireEvent.click(toggle());
      fireEvent.click(day(date(2026, 10, 20)));
      expect(start()).toHaveValue("10/20/2026");
      expect(end()).toHaveValue("");
      expect(onChange).not.toHaveBeenCalled();
    });

    it("flags the half range a first pick leaves once the calendar closes without a second", async () => {
      renderField();
      fireEvent.click(toggle());
      fireEvent.click(day(date(2026, 10, 12)));
      fireEvent.keyDown(document, { key: "Escape" });
      await waitFor(() => expect(panel()).toBeNull());
      expect(start()).toHaveValue("10/12/2026");
      expect(end()).toHaveAttribute("aria-invalid", "true");
    });

    it("completes a range from a typed start with one pick, on the start's month", async () => {
      const onChange = vi.fn();
      renderField({ onChange });
      fill(start(), "12/03/2026");
      blur(start());

      fireEvent.click(toggle());
      expect(heading()).toBe("December 2026");
      expect(day(date(2026, 12, 3))).toHaveAttribute("aria-selected", "true");
      fireEvent.click(day(date(2026, 12, 10)));
      expect(onChange.mock.calls).toEqual([[range(date(2026, 12, 3), date(2026, 12, 10))]]);
      await waitFor(() => expect(panel()).toBeNull());
    });

    it("opens on the committed start's month", () => {
      renderField({ defaultValue: range(date(2027, 3, 9), date(2027, 4, 2)) });
      fireEvent.click(toggle());
      expect(heading()).toBe("March 2027");
    });

    it("opens on today's month when the field is empty", () => {
      renderField();
      fireEvent.click(toggle());
      expect(heading()).toBe("October 2026");
    });

    it("opens on min's month when today is before it", () => {
      renderField({ min: date(2027, 2, 10) });
      fireEvent.click(toggle());
      expect(heading()).toBe("February 2027");
    });

    it("opens at first with defaultOpen, and only as a controlled open prop says", () => {
      const onOpenChange = vi.fn();
      const { rerender } = renderField({ open: true, onOpenChange });
      expect(panel()).not.toBeNull();
      fireEvent.click(toggle());
      expect(onOpenChange.mock.calls).toEqual([[false]]);
      expect(panel()).not.toBeNull();
      rerender(<DateRangeField aria-label="Stay" locale={enUS} today={TODAY} open={false} onOpenChange={onOpenChange} />);
      expect(panel()).toBeNull();
    });

    it.each([
      ["disabled", { disabled: true }],
      ["read-only", { readOnly: true }],
    ] as const)("does not open in a %s field", (_, state) => {
      const onOpenChange = vi.fn();
      renderField({ ...state, defaultOpen: true, onOpenChange });
      expect(toggle()).toBeDisabled();
      expect(panel()).toBeNull();
      fireEvent.click(toggle());
      expect(onOpenChange).not.toHaveBeenCalled();
    });
  });
});
