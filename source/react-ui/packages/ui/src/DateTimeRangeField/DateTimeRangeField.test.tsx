import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { LocaleProvider } from "@vipengele/react-tokens";
import { Locale, LocalDate, LocalDateTime } from "@vipengele/ts";
import { createRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { FormField } from "../FormField/FormField.js";
import type { DateTimeRange } from "../internal/localRange.js";
import { DateTimeRangeField, type DateTimeRangeFieldProps } from "./DateTimeRangeField.js";

// en-US writes month/day/year on a 12-hour clock and de-DE day.month.year on a 24-hour one,
// whatever the runtime's own locale is. Every test passes a fixed `today` unless it is about the
// defaults, so nothing depends on the day the suite runs.
const enUS = new Locale("en-US");
const deDE = new Locale("de-DE");
const TODAY = LocalDate.of(2026, 10, 14);
const dt = (iso: string) => LocalDateTime.parse(iso);
const date = (year: number, month: number, day: number) => LocalDate.of(year, month, day);
const range = (start: string, end: string): DateTimeRange => ({ start: dt(start), end: dt(end) });
const OCTOBER = range("2026-10-05T09:00", "2026-10-09T17:30");

function renderField(props: Partial<DateTimeRangeFieldProps> = {}) {
  return render(<DateTimeRangeField aria-label="Shift" locale={enUS} today={TODAY} {...props} />);
}

const group = () => screen.getByRole("group", { name: "Shift" }) as HTMLElement;
const start = () => screen.getByRole("textbox", { name: "Shift Start" }) as HTMLInputElement;
const end = () => screen.getByRole("textbox", { name: "Shift End" }) as HTMLInputElement;
/** An editor's text with U+202F read as a plain space: ICU writes either before a day period. */
const shown = (editor: HTMLInputElement) => editor.value.replace(/ /g, " ");
/** The inputs carrying the form values. They have no role, so no query in `screen` reaches them. */
const hiddenInputs = (container: HTMLElement) => [...container.querySelectorAll("input")].filter((input) => input.type === "hidden");
const hiddenNamed = (container: HTMLElement, name: string) =>
  hiddenInputs(container).find((input) => input.name === name) as HTMLInputElement;
const clearButton = (name = "Clear dates and times") => screen.getByRole("button", { name });
const queryClearButton = () => screen.queryByRole("button", { name: "Clear dates and times" });
const toggle = () => document.querySelector(".vpg-date-time-range-field-calendar-toggle") as HTMLButtonElement;
const panel = () => document.querySelector(".vpg-date-time-range-field-panel");
/** A day of the open calendar, by its ISO date. */
const day = (value: LocalDate) => document.querySelector(`[data-date="${value.toString()}"]`) as HTMLElement;
const heading = () => (document.querySelector(".vpg-calendar-heading") as HTMLElement).textContent;
const timePanel = (name = "Start time") => screen.getByRole("group", { name });
const option = (panelName: string, strip: string, label: string) =>
  within(within(timePanel(panelName)).getByRole("radiogroup", { name: strip })).getByRole("radio", { name: label });
const done = () => screen.getByRole("button", { name: "Done" });

/** Real focus, not a synthesised event: leaving the field is judged by where focus lands. */
const focus = (element: HTMLElement) => act(() => element.focus());
const blur = (element: HTMLElement) => act(() => element.blur());
const type = (element: HTMLElement, text: string) => fireEvent.change(element, { target: { value: text } });
/** Focuses `element` and replaces its text with `text`. */
function fill(element: HTMLInputElement, text: string) {
  focus(element);
  type(element, text);
}

/** A focusable element outside the field, to move focus out of it onto. */
function outside() {
  const button = document.createElement("button");
  button.textContent = "Elsewhere";
  document.body.append(button);
  return button;
}

describe("DateTimeRangeField", () => {
  describe("structure", () => {
    it("renders two text editors in a group marked as the shell's growing control", () => {
      renderField({ className: "custom" });
      expect(group()).toHaveClass("vpg-date-time-range-field", "vpg-field-shell-control", "custom");
      expect(group().parentElement).toHaveClass("vpg-field-shell");
      for (const editor of [start(), end()]) {
        expect(editor).toHaveAttribute("type", "text");
        expect(editor).toHaveAttribute("autocomplete", "off");
        expect(editor).not.toHaveAttribute("name");
        expect(editor.placeholder.replace(/ /g, " ")).toBe("mm/dd/yyyy hh:mm AM/PM");
        expect(editor).toHaveAttribute("aria-description", "Format: month / day / year / hour / minute / day period");
      }
    });

    it("forwards arbitrary attributes and the ref to the group", () => {
      const ref = createRef<HTMLDivElement>();
      renderField({ id: "shift", ref, "data-testid": "root" } as Partial<DateTimeRangeFieldProps>);
      expect(group()).toHaveAttribute("id", "shift");
      expect(group()).toHaveAttribute("data-testid", "root");
      expect(ref.current).toBe(group());
    });

    it("injects its stylesheet once for any number of fields", () => {
      render(
        <>
          <DateTimeRangeField aria-label="Shift" />
          <DateTimeRangeField aria-label="Trip" />
        </>,
      );
      const styles = document.head.querySelectorAll('style[data-href="vpg-date-time-range-field"]');
      expect(styles).toHaveLength(1);
      expect(styles[0]?.textContent).toContain(".vpg-date-time-range-field {");
    });

    it("never assigns a --vpg-* custom property inline", () => {
      renderField({ defaultValue: OCTOBER });
      for (const element of [group(), start(), end(), clearButton(), toggle()]) {
        expect(element.getAttribute("style")).toBeNull();
      }
    });

    it("shows the committed range in the locale's own layout", () => {
      renderField({ locale: deDE, defaultValue: OCTOBER });
      expect(start()).toHaveValue("05.10.2026 09:00");
      expect(end()).toHaveValue("09.10.2026 17:30");
      expect(start()).toHaveAttribute("placeholder", "dd.mm.yyyy hh:mm");
    });
  });

  describe("naming", () => {
    it("names each editor by the group's aria-label and its own label", () => {
      renderField();
      expect(group()).toHaveAccessibleName("Shift");
      expect(start()).toHaveAccessibleName("Shift Start");
      expect(end()).toHaveAccessibleName("Shift End");
    });

    it("names each editor by the ids the group is labelled by", () => {
      render(
        <>
          <span id="caption">Trip</span>
          <DateTimeRangeField aria-labelledby="caption" locale={enUS} />
        </>,
      );
      expect(screen.getByRole("group")).toHaveAccessibleName("Trip");
      expect(screen.getByRole("textbox", { name: "Trip Start" })).toBeInTheDocument();
      expect(screen.getByRole("textbox", { name: "Trip End" })).toBeInTheDocument();
    });

    it("names each editor by its own label alone when the group has none", () => {
      render(<DateTimeRangeField locale={enUS} />);
      expect(screen.getByRole("textbox", { name: "Start" })).toBeInTheDocument();
      expect(screen.getByRole("textbox", { name: "End" })).toBeInTheDocument();
    });

    it("takes the editors' own labels from startLabel and endLabel", () => {
      renderField({ startLabel: "Departs", endLabel: "Arrives" });
      expect(screen.getByRole("textbox", { name: "Shift Departs" })).toBeInTheDocument();
      expect(screen.getByRole("textbox", { name: "Shift Arrives" })).toBeInTheDocument();
    });

    it("takes FormField's label, description and invalid state on the group", () => {
      render(
        <FormField label="Booking" hint="Local time." error="Pick both ends.">
          <DateTimeRangeField locale={enUS} />
        </FormField>,
      );
      const booking = screen.getByRole("group", { name: "Booking" });
      expect(booking).toHaveAccessibleDescription("Local time. Pick both ends.");
      expect(booking).toHaveAttribute("aria-invalid", "true");
      expect(screen.getByRole("textbox", { name: "Booking Start" })).toBeInTheDocument();
      expect(screen.getByRole("textbox", { name: "Booking End" })).toBeInTheDocument();
    });
  });

  describe("committing typed text", () => {
    it("commits a typed range once both ends are in, never per keystroke, and rewrites it in the locale's form", () => {
      const onChange = vi.fn();
      renderField({ onChange });
      fill(start(), "2026-10-01T09:00");
      fill(end(), "10/20/2026 5:30 PM");
      expect(onChange).not.toHaveBeenCalled();
      blur(end());
      expect(onChange.mock.calls).toEqual([[range("2026-10-01T09:00", "2026-10-20T17:30")]]);
      expect(shown(start())).toBe("10/01/2026 09:00 AM");
      expect(shown(end())).toBe("10/20/2026 05:30 PM");
      expect(group()).not.toHaveAttribute("aria-invalid");
    });

    it("commits on Enter, with the form values in the DOM before Enter's own handler returns", () => {
      let during: string[] = [];
      const onChange = vi.fn();
      const { container } = render(
        <form>
          <DateTimeRangeField
            aria-label="Shift"
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
      fill(start(), "2026-10-01T09:00");
      fill(end(), "2026-10-01T17:00");
      expect(fireEvent.keyDown(end(), { key: "Enter" })).toBe(true);
      expect(onChange).toHaveBeenCalledWith(range("2026-10-01T09:00", "2026-10-01T17:00"));
      expect(during).toEqual(["2026-10-01T09:00", "2026-10-01T17:00"]);
    });

    it("leaves an Enter that confirms an IME composition, and every other key, alone", () => {
      const onChange = vi.fn();
      renderField({ onChange });
      fill(start(), "2026-10-01T09:00");
      fill(end(), "2026-10-01T17:00");
      fireEvent.keyDown(end(), { key: "Enter", isComposing: true });
      fireEvent.keyDown(end(), { key: "ArrowUp" });
      expect(onChange).not.toHaveBeenCalled();
    });

    it("commits an edit of one end against the other's committed date-time, keeping its seconds", () => {
      const onChange = vi.fn();
      const withSeconds = range("2026-10-05T09:00:30", "2026-10-09T17:30");
      renderField({ defaultValue: withSeconds, onChange });
      fill(end(), "2026-10-12T10:00");
      blur(end());
      expect(onChange.mock.calls).toEqual([[range("2026-10-05T09:00:30", "2026-10-12T10:00")]]);
    });

    it("commits equal ends as a range of one instant", () => {
      const onChange = vi.fn();
      renderField({ onChange });
      fill(start(), "2026-10-05T09:00");
      fill(end(), "2026-10-05T09:00");
      blur(end());
      expect(onChange).toHaveBeenCalledWith(range("2026-10-05T09:00", "2026-10-05T09:00"));
    });

    it("decides nothing again when focus moves between the editors with no edit", () => {
      const onChange = vi.fn();
      renderField({ defaultValue: OCTOBER, onChange });
      focus(start());
      focus(end());
      blur(end());
      expect(onChange).not.toHaveBeenCalled();
    });

    it("reports nothing for text naming the committed range another way, and rewrites it", () => {
      const onChange = vi.fn();
      renderField({ defaultValue: OCTOBER, onChange });
      fill(start(), "2026-10-05T09:00");
      blur(start());
      expect(onChange).not.toHaveBeenCalled();
      expect(shown(start())).toBe("10/05/2026 09:00 AM");
    });

    it("rejects a same-day end time before the start time: both flagged, nothing committed, the texts kept", () => {
      const onChange = vi.fn();
      const { container } = renderField({ defaultValue: OCTOBER, startName: "from", endName: "to", onChange });
      fill(start(), "2026-10-12T17:00");
      fill(end(), "2026-10-12T09:00");
      blur(end());
      expect(onChange).not.toHaveBeenCalled();
      expect(start()).toHaveValue("2026-10-12T17:00");
      expect(end()).toHaveValue("2026-10-12T09:00");
      expect(start()).toHaveAttribute("aria-invalid", "true");
      expect(end()).toHaveAttribute("aria-invalid", "true");
      expect(group()).toHaveAttribute("aria-invalid", "true");
      expect(hiddenNamed(container, "from")).toHaveValue("2026-10-05T09:00");
      expect(hiddenNamed(container, "to")).toHaveValue("2026-10-09T17:30");
    });

    it("commits once a reversed range is put in order", () => {
      const onChange = vi.fn();
      renderField({ onChange });
      fill(start(), "2026-10-12T17:00");
      fill(end(), "2026-10-12T09:00");
      fill(start(), "2026-10-12T08:00");
      blur(start());
      expect(onChange.mock.calls).toEqual([[range("2026-10-12T08:00", "2026-10-12T09:00")]]);
      expect(group()).not.toHaveAttribute("aria-invalid");
    });

    it("flags only the editor whose text reads as no accepted date-time", () => {
      const onChange = vi.fn();
      renderField({ min: dt("2026-10-01T09:00"), isDateDisabled: (d) => d.day === 20, onChange });
      fill(start(), "2026-10-01T08:00");
      fill(end(), "2026-10-05T09:00");
      blur(end());
      expect(onChange).not.toHaveBeenCalled();
      expect(start()).toHaveAttribute("aria-invalid", "true");
      expect(end()).not.toHaveAttribute("aria-invalid");

      fill(start(), "2026-10-02T09:00");
      fill(end(), "2026-10-20T09:00");
      blur(end());
      expect(start()).not.toHaveAttribute("aria-invalid");
      expect(end()).toHaveAttribute("aria-invalid", "true");
    });

    it("rejects a date with no time at once", () => {
      renderField();
      fill(start(), "10/05/2026");
      blur(start());
      expect(start()).toHaveAttribute("aria-invalid", "true");
    });

    it("holds a half-filled range as incomplete, flagged only once focus has left the field", () => {
      const onChange = vi.fn();
      renderField({ onChange });
      fill(start(), "2026-10-01T09:00");
      focus(end());
      expect(group()).not.toHaveAttribute("aria-invalid");
      blur(end());
      expect(onChange).not.toHaveBeenCalled();
      expect(shown(start())).toBe("2026-10-01T09:00");
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
      expect(hiddenNamed(container, "from")).toHaveValue("2026-10-05T09:00");
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

    it("reports nothing when an empty field is emptied again", () => {
      const onChange = vi.fn();
      renderField({ onChange });
      fill(start(), "soon");
      blur(start());
      fill(start(), "");
      blur(start());
      expect(onChange).not.toHaveBeenCalled();
      expect(group()).not.toHaveAttribute("aria-invalid");
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

    it("drops a pending day", () => {
      renderField();
      fireEvent.click(toggle());
      fireEvent.click(day(date(2026, 10, 20)));
      expect(start()).toHaveValue("10/20/2026");
      fireEvent.click(clearButton());
      expect(start()).toHaveValue("");
      focus(outside());
      expect(group()).not.toHaveAttribute("aria-invalid");
    });

    it("stops a press from moving focus, and takes its name from clearLabel", () => {
      renderField({ defaultValue: OCTOBER, clearLabel: "Löschen" });
      expect(fireEvent.mouseDown(clearButton("Löschen"))).toBe(false);
    });

    it("is absent from a disabled or read-only field", () => {
      const { rerender } = renderField({ defaultValue: OCTOBER, disabled: true });
      expect(queryClearButton()).toBeNull();
      rerender(<DateTimeRangeField aria-label="Shift" locale={enUS} defaultValue={OCTOBER} readOnly />);
      expect(queryClearButton()).toBeNull();
    });
  });

  describe("controlled", () => {
    const JANUARY = range("2026-01-01T09:00", "2026-01-02T17:00");

    it("leaves an edit in progress alone when the value changes", () => {
      const { rerender } = renderField({ value: OCTOBER });
      fill(start(), "10/2");
      rerender(<DateTimeRangeField aria-label="Shift" locale={enUS} value={JANUARY} />);
      expect(start()).toHaveValue("10/2");
      expect(shown(end())).toBe("10/09/2026 05:30 PM");
    });

    it("shows the new value once focus has left", () => {
      const { rerender } = renderField({ value: OCTOBER });
      rerender(<DateTimeRangeField aria-label="Shift" locale={enUS} value={JANUARY} />);
      expect(shown(start())).toBe("01/01/2026 09:00 AM");
      expect(shown(end())).toBe("01/02/2026 05:00 PM");
    });

    it("reverts to the range the parent kept when a commit is not adopted, and reports it once", () => {
      const onChange = vi.fn();
      renderField({ value: OCTOBER, onChange });
      fill(end(), "2026-10-20T17:30");
      focus(start());
      blur(start());
      expect(onChange.mock.calls).toEqual([[range("2026-10-05T09:00", "2026-10-20T17:30")]]);
      expect(shown(end())).toBe("10/09/2026 05:30 PM");
    });

    it("adopts what a parent stores", () => {
      function Controlled() {
        const [shift, setShift] = useState<DateTimeRange | undefined>(OCTOBER);
        return <DateTimeRangeField aria-label="Shift" locale={enUS} value={shift} onChange={setShift} />;
      }
      render(<Controlled />);
      fill(end(), "2026-12-01T08:00");
      blur(end());
      expect(shown(end())).toBe("12/01/2026 08:00 AM");
    });

    it("clears a stuck invalid flag once a parent moves the value on", () => {
      const { rerender } = renderField({ value: OCTOBER });
      fill(start(), "soon");
      blur(start());
      expect(group()).toHaveAttribute("aria-invalid", "true");

      rerender(<DateTimeRangeField aria-label="Shift" locale={enUS} value={JANUARY} />);
      expect(shown(start())).toBe("01/01/2026 09:00 AM");
      expect(group()).not.toHaveAttribute("aria-invalid");
    });

    it("keeps the flag when a parent passes an equal range again", () => {
      const { rerender } = renderField({ value: OCTOBER });
      fill(start(), "soon");
      blur(start());
      rerender(<DateTimeRangeField aria-label="Shift" locale={enUS} value={range("2026-10-05T09:00", "2026-10-09T17:30")} />);
      expect(start()).toHaveValue("soon");
      expect(group()).toHaveAttribute("aria-invalid", "true");
    });

    it("drops a pending day when the parent moves the value on", async () => {
      const { rerender } = renderField({ value: OCTOBER });
      fireEvent.click(toggle());
      fireEvent.click(day(date(2026, 10, 20)));
      expect(shown(start())).toBe("10/20/2026 09:00 AM");
      expect(end()).toHaveValue("");
      fireEvent.keyDown(document, { key: "Escape" });
      await waitFor(() => expect(panel()).toBeNull());

      rerender(<DateTimeRangeField aria-label="Shift" locale={enUS} value={JANUARY} />);
      expect(shown(start())).toBe("01/01/2026 09:00 AM");
      expect(shown(end())).toBe("01/02/2026 05:00 PM");
    });

    it("is controlled and empty with value={undefined}", () => {
      const onChange = vi.fn();
      renderField({ value: undefined, defaultValue: OCTOBER, onChange });
      expect(start()).toHaveValue("");
      fill(start(), "2026-10-01T09:00");
      fill(end(), "2026-10-02T09:00");
      blur(end());
      expect(onChange).toHaveBeenCalledWith(range("2026-10-01T09:00", "2026-10-02T09:00"));
      expect(start()).toHaveValue("");
    });
  });

  describe("invalid", () => {
    it("flags each end of a committed value the field would not commit", () => {
      renderField({ value: range("2025-01-01T09:00", "2026-10-02T09:00"), min: dt("2026-01-01T00:00") });
      expect(start()).toHaveAttribute("aria-invalid", "true");
      expect(end()).not.toHaveAttribute("aria-invalid");
      expect(group()).toHaveAttribute("aria-invalid", "true");
    });

    it("flags both ends of a committed value that runs backwards", () => {
      renderField({ value: range("2026-10-05T17:00", "2026-10-05T09:00") });
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

    it("makes both editors read-only", () => {
      renderField({ readOnly: true });
      expect(start()).toHaveAttribute("readonly");
      expect(end()).toHaveAttribute("readonly");
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

    it("carries each named end as an ISO 8601 date-time, with seconds when they are not zero", () => {
      const { container } = renderField({
        defaultValue: range("2026-10-05T09:00:30", "2026-10-09T17:30"),
        startName: "from",
        endName: "to",
      });
      expect(hiddenNamed(container, "from")).toHaveValue("2026-10-05T09:00:30");
      expect(hiddenNamed(container, "to")).toHaveValue("2026-10-09T17:30");
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
          <DateTimeRangeField aria-label="Shift" value={OCTOBER} />
        </LocaleProvider>,
      );
      expect(start()).toHaveValue("05.10.2026 09:00");
    });
  });

  describe("handlers", () => {
    it("calls a caller's focus and blur handlers as focus enters and leaves the group", () => {
      const onFocus = vi.fn();
      const onBlur = vi.fn();
      renderField({ onFocus, onBlur });
      focus(start());
      focus(end());
      focus(outside());
      expect(onFocus).toHaveBeenCalledTimes(2);
      expect(onBlur).toHaveBeenCalledTimes(2);
    });
  });

  describe("pop-up", () => {
    it("opens a non-modal panel holding a range calendar, a time panel for each end and a Done button", () => {
      renderField();
      expect(toggle()).toHaveAccessibleName("Choose dates and times");
      expect(toggle().closest(".vpg-field-shell-leading")).not.toBeNull();
      expect(toggle()).toHaveAttribute("aria-expanded", "false");
      fireEvent.click(toggle());
      expect(toggle()).toHaveAttribute("aria-expanded", "true");
      const box = panel() as HTMLElement;
      expect(box.querySelector(".vpg-range-calendar")).toContainElement(screen.getByRole("grid"));
      expect(box).toContainElement(timePanel("Start time"));
      expect(box).toContainElement(timePanel("End time"));
      expect(box).toContainElement(done());
      expect(screen.queryByRole("dialog")).toBeNull();
    });

    it("names its controls from their label props", () => {
      renderField({
        openCalendarLabel: "Pick",
        previousMonthLabel: "Back",
        nextMonthLabel: "On",
        startTimeLabel: "From",
        endTimeLabel: "Until",
        hourLabel: "H",
        minuteLabel: "M",
        dayPeriodLabel: "P",
        doneLabel: "Close",
      });
      fireEvent.click(screen.getByRole("button", { name: "Pick" }));
      expect(screen.getByRole("button", { name: "Back" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "On" })).toBeInTheDocument();
      for (const name of ["From", "Until"]) {
        const times = within(timePanel(name));
        expect(times.getByRole("radiogroup", { name: "H" })).toBeInTheDocument();
        expect(times.getByRole("radiogroup", { name: "M" })).toBeInTheDocument();
        expect(times.getByRole("radiogroup", { name: "P" })).toBeInTheDocument();
      }
      expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
    });

    it("shows the committed days in the calendar and each end's time in its panel", () => {
      renderField({ defaultValue: OCTOBER });
      fireEvent.click(toggle());
      expect(heading()).toBe("October 2026");
      expect(day(date(2026, 10, 5))).toHaveAttribute("aria-selected", "true");
      expect(day(date(2026, 10, 9))).toHaveAttribute("aria-selected", "true");
      expect(day(date(2026, 10, 7))).toHaveAttribute("data-in-range");
      expect(option("Start time", "Hour", "09")).toHaveAttribute("aria-checked", "true");
      expect(option("Start time", "AM/PM", "AM")).toHaveAttribute("aria-checked", "true");
      expect(option("End time", "Hour", "05")).toHaveAttribute("aria-checked", "true");
      expect(option("End time", "Minute", "30")).toHaveAttribute("aria-checked", "true");
      expect(option("End time", "AM/PM", "PM")).toHaveAttribute("aria-checked", "true");
    });

    it("passes the minute step to both time panels", () => {
      renderField({ minuteStep: 15 });
      fireEvent.click(toggle());
      for (const name of ["Start time", "End time"]) {
        const minutes = within(within(timePanel(name)).getByRole("radiogroup", { name: "Minute" })).getAllByRole("radio");
        expect(minutes.map((radio) => radio.textContent)).toEqual(["00", "15", "30", "45"]);
      }
    });

    it("keeps each time panel disabled until its end has a day", () => {
      renderField();
      fireEvent.click(toggle());
      const hours = (name: string) => within(timePanel(name)).getByRole("radiogroup", { name: "Hour" });
      expect(hours("Start time")).toHaveAttribute("aria-disabled", "true");
      expect(hours("End time")).toHaveAttribute("aria-disabled", "true");
      fireEvent.click(day(date(2026, 10, 12)));
      expect(hours("Start time")).not.toHaveAttribute("aria-disabled");
      expect(hours("End time")).toHaveAttribute("aria-disabled", "true");
      fireEvent.click(day(date(2026, 10, 16)));
      expect(hours("End time")).not.toHaveAttribute("aria-disabled");
    });

    it("commits nothing until both days and both times are picked", () => {
      const onChange = vi.fn();
      const { container } = renderField({ startName: "from", endName: "to", onChange });
      fireEvent.click(toggle());

      fireEvent.click(day(date(2026, 10, 12)));
      expect(start()).toHaveValue("10/12/2026");
      expect(end()).toHaveValue("");
      expect(day(date(2026, 10, 12))).toHaveAttribute("aria-selected", "true");
      expect(panel()).not.toBeNull();

      fireEvent.click(day(date(2026, 10, 16)));
      expect(start()).toHaveValue("10/12/2026");
      expect(end()).toHaveValue("10/16/2026");
      expect(day(date(2026, 10, 14))).toHaveAttribute("data-in-range");

      fireEvent.click(option("Start time", "Hour", "09"));
      expect(shown(start())).toBe("10/12/2026 09:00 AM");
      expect(onChange).not.toHaveBeenCalled();
      expect(hiddenNamed(container, "from")).toHaveValue("");
      expect(group()).not.toHaveAttribute("aria-invalid");

      fireEvent.click(option("End time", "Hour", "05"));
      expect(onChange.mock.calls).toEqual([[range("2026-10-12T09:00", "2026-10-16T05:00")]]);
      expect(shown(end())).toBe("10/16/2026 05:00 AM");
      expect(hiddenNamed(container, "from")).toHaveValue("2026-10-12T09:00");
      expect(hiddenNamed(container, "to")).toHaveValue("2026-10-16T05:00");
      expect(panel()).not.toBeNull();
    });

    it("re-anchors on a pick after a complete range, keeping each end's time, and commits on the second pick", () => {
      const onChange = vi.fn();
      renderField({ defaultValue: OCTOBER, onChange });
      fireEvent.click(toggle());
      fireEvent.click(day(date(2026, 10, 12)));
      expect(shown(start())).toBe("10/12/2026 09:00 AM");
      expect(end()).toHaveValue("");
      expect(onChange).not.toHaveBeenCalled();

      fireEvent.click(day(date(2026, 10, 14)));
      expect(onChange.mock.calls).toEqual([[range("2026-10-12T09:00", "2026-10-14T17:30")]]);
      expect(panel()).not.toBeNull();
    });

    it("orders the picked days but keeps each time on its own end", () => {
      const onChange = vi.fn();
      renderField({ defaultValue: OCTOBER, onChange });
      fireEvent.click(toggle());
      fireEvent.click(day(date(2026, 10, 12)));
      fireEvent.click(day(date(2026, 10, 10)));
      expect(onChange.mock.calls).toEqual([[range("2026-10-10T09:00", "2026-10-12T17:30")]]);
    });

    it("rejects a same-day end time before the start time picked in the panels, flagged at once and never swapped", () => {
      const onChange = vi.fn();
      renderField({ onChange });
      fireEvent.click(toggle());
      fireEvent.click(day(date(2026, 10, 12)));
      fireEvent.click(day(date(2026, 10, 12)));
      fireEvent.click(option("Start time", "Hour", "09"));
      fireEvent.click(option("End time", "Hour", "08"));
      expect(onChange).not.toHaveBeenCalled();
      expect(shown(start())).toBe("10/12/2026 09:00 AM");
      expect(shown(end())).toBe("10/12/2026 08:00 AM");
      expect(end()).toHaveAttribute("aria-invalid", "true");
      expect(group()).toHaveAttribute("aria-invalid", "true");
      expect(option("End time", "Hour", "08")).toHaveAttribute("aria-checked", "true");

      fireEvent.click(option("End time", "Hour", "10"));
      expect(onChange.mock.calls).toEqual([[range("2026-10-12T09:00", "2026-10-12T10:00")]]);
      expect(group()).not.toHaveAttribute("aria-invalid");
    });

    it("commits a time picked for one end of the committed range", () => {
      const onChange = vi.fn();
      renderField({ defaultValue: OCTOBER, onChange });
      fireEvent.click(toggle());
      fireEvent.click(option("End time", "Minute", "45"));
      expect(onChange.mock.calls).toEqual([[range("2026-10-05T09:00", "2026-10-09T17:45")]]);
    });

    it("closes on Done and focuses the end editor", async () => {
      const onOpenChange = vi.fn();
      renderField({ defaultValue: OCTOBER, onOpenChange });
      fireEvent.click(toggle());
      fireEvent.click(done());
      expect(onOpenChange.mock.calls).toEqual([[true], [false]]);
      await waitFor(() => expect(panel()).toBeNull());
      await waitFor(() => expect(end()).toHaveFocus());
    });

    it("commits nothing on Done with a part missing, flagging it once focus leaves the field", async () => {
      const onChange = vi.fn();
      renderField({ onChange });
      fireEvent.click(toggle());
      fireEvent.click(day(date(2026, 10, 12)));
      fireEvent.click(day(date(2026, 10, 16)));
      fireEvent.click(option("Start time", "Hour", "09"));
      fireEvent.click(done());
      await waitFor(() => expect(end()).toHaveFocus());
      expect(onChange).not.toHaveBeenCalled();
      expect(end()).toHaveValue("10/16/2026");
      expect(group()).not.toHaveAttribute("aria-invalid");

      focus(toggle());
      expect(group()).not.toHaveAttribute("aria-invalid");
      focus(outside());
      expect(end()).toHaveAttribute("aria-invalid", "true");
      expect(start()).not.toHaveAttribute("aria-invalid");
    });

    it("keeps a pending day unflagged while focus moves through the pop-up, and again once focus comes back", () => {
      renderField();
      fireEvent.click(toggle());
      fireEvent.click(day(date(2026, 10, 12)));
      focus(day(date(2026, 10, 12)));
      focus(option("Start time", "Hour", "12"));
      expect(group()).not.toHaveAttribute("aria-invalid");

      focus(outside());
      expect(start()).toHaveAttribute("aria-invalid", "true");
      expect(end()).toHaveAttribute("aria-invalid", "true");
      focus(start());
      expect(group()).not.toHaveAttribute("aria-invalid");
    });

    it("leaves a pending day alone on a blur of its untouched text, and commits typed text over it", () => {
      const onChange = vi.fn();
      renderField({ onChange });
      fireEvent.click(toggle());
      fireEvent.click(day(date(2026, 10, 12)));
      fireEvent.click(day(date(2026, 10, 12)));
      focus(start());
      focus(end());
      expect(start()).toHaveValue("10/12/2026");
      expect(start()).not.toHaveAttribute("aria-invalid");

      fill(start(), "2026-10-12T08:00");
      fill(end(), "2026-10-12T09:00");
      blur(end());
      expect(onChange.mock.calls).toEqual([[range("2026-10-12T08:00", "2026-10-12T09:00")]]);
    });

    it("completes a range from a typed start with one pick, on the start's month", () => {
      const onChange = vi.fn();
      renderField({ onChange });
      fill(start(), "2026-12-03T09:00");
      blur(start());

      fireEvent.click(toggle());
      expect(heading()).toBe("December 2026");
      expect(day(date(2026, 12, 3))).toHaveAttribute("aria-selected", "true");
      fireEvent.click(day(date(2026, 12, 10)));
      expect(shown(start())).toBe("12/03/2026 09:00 AM");
      expect(end()).toHaveValue("12/10/2026");
      fireEvent.click(option("End time", "Hour", "05"));
      expect(onChange.mock.calls).toEqual([[range("2026-12-03T09:00", "2026-12-10T05:00")]]);
    });

    it("holds a picked day pending when its end's time is outside the bounds on it", () => {
      renderField({ min: dt("2026-10-01T09:00"), defaultValue: range("2026-10-02T08:00", "2026-10-05T10:00") });
      fireEvent.click(toggle());
      fireEvent.click(day(date(2026, 10, 1)));
      expect(start()).toHaveValue("10/01/2026");
    });

    it("disables the calendar's days outside the bounds' dates and the disabled days", () => {
      renderField({
        min: dt("2026-10-02T09:00"),
        max: dt("2026-10-30T17:00"),
        isDateDisabled: (d) => d.day === 20,
        defaultValue: range("2026-10-03T10:00", "2026-10-05T10:00"),
      });
      fireEvent.click(toggle());
      expect(day(date(2026, 10, 1))).toHaveAttribute("aria-disabled", "true");
      expect(day(date(2026, 10, 2))).not.toHaveAttribute("aria-disabled");
      expect(day(date(2026, 10, 20))).toHaveAttribute("aria-disabled", "true");
      expect(day(date(2026, 10, 31))).toHaveAttribute("aria-disabled", "true");
    });

    it("disables the times outside a bound only on that bound's own date, in each end's panel", () => {
      const bounds = { min: dt("2026-10-01T09:00"), max: dt("2026-10-31T17:00") };
      const { unmount } = renderField({ ...bounds, defaultValue: range("2026-10-01T10:00", "2026-10-30T10:00") });
      fireEvent.click(toggle());
      expect(option("Start time", "Hour", "08")).toHaveAttribute("aria-disabled", "true");
      expect(option("End time", "Hour", "08")).not.toHaveAttribute("aria-disabled");
      unmount();

      renderField({ ...bounds, defaultValue: range("2026-10-02T10:00", "2026-10-31T12:00") });
      fireEvent.click(toggle());
      expect(option("Start time", "Hour", "08")).not.toHaveAttribute("aria-disabled");
      expect(option("End time", "Hour", "06")).toHaveAttribute("aria-disabled", "true");
    });

    it("opens on the committed start's month, else today's, else the bound today lies past", () => {
      const first = renderField({ defaultValue: range("2027-03-09T10:00", "2027-04-02T10:00") });
      fireEvent.click(toggle());
      expect(heading()).toBe("March 2027");
      first.unmount();

      const second = renderField();
      fireEvent.click(toggle());
      expect(heading()).toBe("October 2026");
      second.unmount();

      renderField({ min: dt("2027-02-10T09:00") });
      fireEvent.click(toggle());
      expect(heading()).toBe("February 2027");
    });

    it("opens at first with defaultOpen, and only as a controlled open prop says", () => {
      const onOpenChange = vi.fn();
      const { rerender } = renderField({ open: true, onOpenChange });
      expect(panel()).not.toBeNull();
      fireEvent.click(done());
      expect(onOpenChange.mock.calls).toEqual([[false]]);
      expect(panel()).not.toBeNull();
      rerender(<DateTimeRangeField aria-label="Shift" locale={enUS} today={TODAY} open={false} onOpenChange={onOpenChange} />);
      expect(panel()).toBeNull();
    });

    it("opens at first with defaultOpen", () => {
      renderField({ defaultOpen: true });
      expect(panel()).not.toBeNull();
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
