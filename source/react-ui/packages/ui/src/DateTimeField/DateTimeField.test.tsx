import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { LocaleProvider } from "@vipengele/react-tokens";
import { Locale, LocalDate, LocalDateTime } from "@vipengele/ts";
import { createRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { DateTimeField, type DateTimeFieldProps } from "./DateTimeField.js";

// en-US writes month/day/year on a 12-hour clock and de-DE day.month.year on a 24-hour one,
// whatever the runtime's own locale is. Every test passes a fixed `today`, so nothing depends on
// the day the suite runs.
const enUS = new Locale("en-US");
const deDE = new Locale("de-DE");
const TODAY = LocalDate.of(2026, 10, 14);
const dt = (iso: string) => LocalDateTime.parse(iso);

function renderField(props: Partial<DateTimeFieldProps> = {}) {
  return render(<DateTimeField aria-label="Starts" locale={enUS} today={TODAY} {...props} />);
}

const field = () => screen.getByRole("textbox", { name: "Starts" }) as HTMLInputElement;
/** The input's text with U+202F read as a plain space: ICU writes either before a day period. */
const shown = () => field().value.replace(/ /g, " ");
/** The input carrying the form value. It has no role, so no query in `screen` reaches it. */
const hidden = (container: HTMLElement) =>
  [...container.querySelectorAll("input")].find((input) => input.type === "hidden") as HTMLInputElement;
const toggle = () => screen.getByRole("button", { name: "Choose date and time" });
const panel = () => document.querySelector(".vpg-date-time-field-panel");
const day = (name: string) => screen.getByRole("gridcell", { name });
const option = (strip: string, label: string) =>
  within(screen.getByRole("radiogroup", { name: strip })).getByRole("radio", { name: label });
const done = () => screen.getByRole("button", { name: "Done" });
const isInvalid = () => field().getAttribute("aria-invalid") === "true";

/** Real focus, not a synthesised event: leaving the field is judged by where focus lands. */
const focus = (element: HTMLElement) => act(() => element.focus());
const blur = (element: HTMLElement) => act(() => element.blur());
const type = (text: string) => fireEvent.change(field(), { target: { value: text } });

/** Types `text` into the field and blurs it. */
function enter(text: string) {
  focus(field());
  type(text);
  blur(field());
}

/** A focusable element outside the field, to move focus out of it onto. */
function outside() {
  const button = document.createElement("button");
  button.textContent = "Elsewhere";
  document.body.append(button);
  return button;
}

describe("DateTimeField", () => {
  describe("structure", () => {
    it("renders one text input, marked as the shell's growing control", () => {
      renderField({ className: "custom" });
      expect(screen.getAllByRole("textbox")).toHaveLength(1);
      expect(field()).toHaveAttribute("type", "text");
      expect(field()).toHaveAttribute("autocomplete", "off");
      expect(field()).toHaveClass("vpg-date-time-field", "vpg-field-shell-control", "custom");
      expect(field().parentElement).toHaveClass("vpg-field-shell");
    });

    it("puts the calendar button in the shell's leading slot", () => {
      renderField();
      expect(toggle()).toHaveAttribute("type", "button");
      expect(toggle().closest(".vpg-field-shell-leading")).not.toBeNull();
      expect(toggle().querySelector("svg")).toHaveAttribute("aria-hidden", "true");
      expect(toggle()).toHaveAttribute("aria-expanded", "false");
      expect(toggle()).not.toHaveAttribute("aria-haspopup");
      expect(toggle().getAttribute("style")).toBeNull();
    });

    it("forwards its ref and native attributes to the input", () => {
      const ref = createRef<HTMLInputElement>();
      renderField({ ref, id: "starts", "aria-describedby": "hint", required: true });
      expect(ref.current).toBe(field());
      expect(field()).toHaveAttribute("id", "starts");
      expect(field()).toHaveAttribute("aria-describedby", "hint");
      expect(field()).toBeRequired();
    });

    it("calls a function ref with the input", () => {
      const ref = vi.fn();
      renderField({ ref });
      expect(ref).toHaveBeenCalledWith(field());
    });

    it("is reached by a label's htmlFor", () => {
      render(
        <>
          <label htmlFor="when">When</label>
          <DateTimeField id="when" locale={enUS} />
        </>,
      );
      expect(screen.getByRole("textbox", { name: "When" })).toBeInTheDocument();
    });

    it("injects its stylesheet once for any number of fields", () => {
      render(
        <>
          <DateTimeField aria-label="Starts" locale={enUS} />
          <DateTimeField aria-label="Ends" locale={enUS} />
        </>,
      );
      const styles = document.head.querySelectorAll('style[data-href="vpg-date-time-field"]');
      expect(styles).toHaveLength(1);
      expect(styles[0]?.textContent).toContain(".vpg-date-time-field {");
    });
  });

  describe("text", () => {
    it("shows the value as the date and the time in the locale's order, separated by a space", () => {
      renderField({ defaultValue: dt("2026-10-15T21:05") });
      expect(shown()).toBe("10/15/2026 09:05 PM");
    });

    it("writes a 24-hour locale's own order", () => {
      renderField({ locale: deDE, defaultValue: dt("2026-10-15T21:05") });
      expect(shown()).toBe("15.10.2026 21:05");
    });

    it("takes the locale from the nearest LocaleProvider", () => {
      render(
        <LocaleProvider locale={deDE}>
          <DateTimeField aria-label="Starts" today={TODAY} defaultValue={dt("2026-10-15T21:05")} />
        </LocaleProvider>,
      );
      expect(shown()).toBe("15.10.2026 21:05");
    });

    it("is empty without a value", () => {
      renderField();
      expect(field()).toHaveValue("");
    });

    it("shows the locale's format as its placeholder", () => {
      renderField();
      expect(field().placeholder.replace(/ /g, " ")).toBe("mm/dd/yyyy hh:mm AM/PM");
    });

    it("shows a 24-hour locale's format with no day period", () => {
      renderField({ locale: deDE });
      expect(field()).toHaveAttribute("placeholder", "dd.mm.yyyy hh:mm");
    });

    it("keeps a placeholder the caller passes", () => {
      renderField({ placeholder: "When?" });
      expect(field()).toHaveAttribute("placeholder", "When?");
    });

    it("describes the order of its fields", () => {
      renderField();
      expect(field()).toHaveAttribute("aria-description", "Format: month / day / year / hour / minute / day period");
    });

    it("keeps a description the caller passes", () => {
      renderField({ "aria-description": "Starting time" });
      expect(field()).toHaveAttribute("aria-description", "Starting time");
    });
  });

  describe("typing", () => {
    /** Types one character at a time, each on top of what the box then shows. */
    function typeEach(text: string) {
      focus(field());
      for (const character of text) type(field().value + character);
    }

    it("lays out en-US's date, a padded 12-hour time and the day period from digits and a letter", () => {
      renderField();
      typeEach("101520260905p");
      expect(shown()).toBe("10/15/2026 09:05 PM");
    });

    it("picks either day period in either letter case", () => {
      renderField();
      typeEach("101520260905a");
      expect(shown()).toBe("10/15/2026 09:05 AM");
      fireEvent.change(field(), { target: { value: "" } });
      typeEach("101520260905A");
      expect(shown()).toBe("10/15/2026 09:05 AM");
      fireEvent.change(field(), { target: { value: "" } });
      typeEach("101520260905P");
      expect(shown()).toBe("10/15/2026 09:05 PM");
    });

    it("lays out de-DE's date and 24-hour time from digits", () => {
      renderField({ locale: deDE });
      typeEach("151020262105");
      expect(field().value).toBe("15.10.2026 21:05");
    });

    it("commits what was typed", () => {
      const onChange = vi.fn();
      renderField({ onChange });
      typeEach("101520260905p");
      blur(field());
      expect(onChange.mock.calls).toEqual([[dt("2026-10-15T21:05")]]);
    });

    it("leaves a deletion, a paste and a typed separator as they come", () => {
      renderField();
      focus(field());
      type("10/15/2026 09:05 PM");
      type("10/15/2026 09:05 P");
      expect(shown()).toBe("10/15/2026 09:05 P");
      type("10/15/2026 0905");
      expect(shown()).toBe("10/15/2026 0905");
      fireEvent.change(field(), { target: { value: "10/" } });
      type("10//");
      expect(shown()).toBe("10/");
    });

    it("keeps the raw text while composing and rewrites it once, from the text the composition began on", () => {
      renderField();
      focus(field());
      type("10/15/202");
      fireEvent.compositionStart(field());
      fireEvent.input(field(), { target: { value: "10/15/2026" }, isComposing: true });
      expect(field().value).toBe("10/15/2026");
      fireEvent.compositionEnd(field());
      expect(field().value).toBe("10/15/2026 ");
    });
  });

  describe("committing typed text", () => {
    it("commits on blur, never per keystroke, and rewrites the text in the locale's form", () => {
      const onChange = vi.fn();
      const { container } = renderField({ name: "starts", onChange });
      focus(field());
      type("10/5/2026 9:05 pm");
      expect(onChange).not.toHaveBeenCalled();

      blur(field());
      expect(onChange.mock.calls).toEqual([[dt("2026-10-05T21:05")]]);
      expect(shown()).toBe("10/05/2026 09:05 PM");
      expect(hidden(container)).toHaveValue("2026-10-05T21:05");
      expect(hidden(container)).toHaveAttribute("name", "starts");
      expect(field()).not.toHaveAttribute("name");
    });

    it("commits on Enter, leaving focus in the input", () => {
      const onChange = vi.fn();
      renderField({ onChange });
      focus(field());
      type("15.10.2026 21:05");
      fireEvent.keyDown(field(), { key: "Enter" });
      expect(onChange).not.toHaveBeenCalled();

      type("10/15/2026 21:05");
      fireEvent.keyDown(field(), { key: "Enter" });
      expect(onChange).not.toHaveBeenCalled();
      expect(isInvalid()).toBe(true);

      type("10/15/2026 9:05 PM");
      fireEvent.keyDown(field(), { key: "Enter" });
      expect(onChange.mock.calls).toEqual([[dt("2026-10-15T21:05")]]);
      expect(field()).toHaveFocus();
    });

    it("leaves an Enter that confirms an IME composition to the composition", () => {
      const onChange = vi.fn();
      renderField({ onChange });
      focus(field());
      type("10/15/2026 9:05 PM");
      fireEvent.keyDown(field(), { key: "Enter", isComposing: true });
      expect(onChange).not.toHaveBeenCalled();
    });

    it("reports nothing for a blur that follows no edit", () => {
      const onChange = vi.fn();
      renderField({ defaultValue: dt("2026-10-15T21:05"), onChange });
      focus(field());
      blur(field());
      expect(onChange).not.toHaveBeenCalled();
    });

    it("reports nothing for text naming the committed value another way, and rewrites it", () => {
      const onChange = vi.fn();
      renderField({ defaultValue: dt("2026-10-15T21:05"), onChange });
      enter("10/15/2026 9:05 pm");
      expect(onChange).not.toHaveBeenCalled();
      expect(shown()).toBe("10/15/2026 09:05 PM");
    });

    it("keeps text that reads as no date-time on screen, flagged and uncommitted", () => {
      const onChange = vi.fn();
      renderField({ defaultValue: dt("2026-10-15T21:05"), onChange });
      enter("soon");
      expect(onChange).not.toHaveBeenCalled();
      expect(field()).toHaveValue("soon");
      expect(isInvalid()).toBe(true);

      enter("10/16/2026 9:05 PM");
      expect(onChange.mock.calls).toEqual([[dt("2026-10-16T21:05")]]);
      expect(isInvalid()).toBe(false);
    });

    it("rejects a date with no time", () => {
      const onChange = vi.fn();
      renderField({ onChange });
      enter("10/15/2026");
      expect(onChange).not.toHaveBeenCalled();
      expect(isInvalid()).toBe(true);
    });

    it("clears on emptied text", () => {
      const onChange = vi.fn();
      const { container } = renderField({ name: "starts", defaultValue: dt("2026-10-15T21:05"), onChange });
      enter("");
      expect(onChange.mock.calls).toEqual([[undefined]]);
      expect(hidden(container)).toHaveValue("");
    });

    it("reads ISO 8601 in any locale", () => {
      const onChange = vi.fn();
      renderField({ locale: deDE, onChange });
      enter("2026-10-15T21:05");
      expect(onChange.mock.calls).toEqual([[dt("2026-10-15T21:05")]]);
      expect(shown()).toBe("15.10.2026 21:05");
    });

    it("forwards its focus, blur and key handlers", () => {
      const onFocus = vi.fn();
      const onBlur = vi.fn();
      const onKeyDown = vi.fn();
      renderField({ onFocus, onBlur, onKeyDown });
      focus(field());
      fireEvent.keyDown(field(), { key: "a" });
      blur(field());
      expect(onFocus).toHaveBeenCalledTimes(1);
      expect(onKeyDown).toHaveBeenCalledTimes(1);
      expect(onBlur).toHaveBeenCalledTimes(1);
    });
  });

  describe("min and max", () => {
    const bounds = { min: dt("2026-10-01T09:00"), max: dt("2026-10-05T17:30") };

    it("rejects typed text outside the bounds and commits the bounds themselves", () => {
      const onChange = vi.fn();
      renderField({ ...bounds, onChange });
      enter("10/01/2026 8:59 AM");
      expect(onChange).not.toHaveBeenCalled();
      expect(isInvalid()).toBe(true);

      enter("10/05/2026 5:30 PM");
      expect(onChange.mock.calls).toEqual([[bounds.max]]);
      expect(isInvalid()).toBe(false);
    });

    it("flags a value outside the bounds without correcting it", () => {
      const onChange = vi.fn();
      renderField({ ...bounds, defaultValue: dt("2026-10-06T10:00"), onChange });
      expect(isInvalid()).toBe(true);
      expect(shown()).toBe("10/06/2026 10:00 AM");
      expect(onChange).not.toHaveBeenCalled();
    });

    it("disables the calendar's days outside the bounds' dates", () => {
      renderField({ min: dt("2026-10-02T09:00"), max: bounds.max, defaultValue: dt("2026-10-03T10:00") });
      fireEvent.click(toggle());
      expect(day("10/01/2026")).toHaveAttribute("aria-disabled", "true");
      expect(day("10/02/2026")).not.toHaveAttribute("aria-disabled");
      expect(day("10/05/2026")).not.toHaveAttribute("aria-disabled");
      expect(day("10/06/2026")).toHaveAttribute("aria-disabled", "true");
    });

    it("disables the times outside a bound only on that bound's own date", () => {
      renderField({ ...bounds, defaultValue: dt("2026-10-01T10:00") });
      fireEvent.click(toggle());
      expect(option("Hour", "08")).toHaveAttribute("aria-disabled", "true");
      expect(option("Hour", "09")).not.toHaveAttribute("aria-disabled");

      fireEvent.click(day("10/02/2026"));
      expect(option("Hour", "08")).not.toHaveAttribute("aria-disabled");
    });

    it("holds a picked day pending when the committed time is outside the bounds on it", () => {
      const onChange = vi.fn();
      renderField({ ...bounds, defaultValue: dt("2026-10-02T18:00"), onChange });
      fireEvent.click(toggle());
      fireEvent.click(day("10/05/2026"));
      expect(onChange).not.toHaveBeenCalled();
      expect(shown()).toBe("10/05/2026");
      expect(option("AM/PM", "PM")).toHaveAttribute("aria-checked", "false");

      fireEvent.click(option("Hour", "03"));
      expect(onChange.mock.calls).toEqual([[dt("2026-10-05T03:00")]]);
    });
  });

  describe("pop-up", () => {
    it("opens a non-modal panel holding a calendar, a time panel and a Done button", () => {
      renderField();
      fireEvent.click(toggle());
      expect(toggle()).toHaveAttribute("aria-expanded", "true");
      const box = panel() as HTMLElement;
      expect(box).toContainElement(screen.getByRole("grid"));
      expect(box).toContainElement(screen.getByRole("radiogroup", { name: "Hour" }));
      expect(box).toContainElement(done());
      expect(screen.queryByRole("dialog")).toBeNull();
      expect(field().closest("[aria-hidden='true'], [inert]")).toBeNull();
    });

    it("never opens from the text input", () => {
      renderField();
      focus(field());
      type("10/");
      fireEvent.click(field());
      expect(panel()).toBeNull();
    });

    it("names its controls from their label props", () => {
      renderField({
        openCalendarLabel: "Pick",
        previousMonthLabel: "Back",
        nextMonthLabel: "On",
        hourLabel: "H",
        minuteLabel: "M",
        dayPeriodLabel: "P",
        doneLabel: "Close",
      });
      fireEvent.click(screen.getByRole("button", { name: "Pick" }));
      expect(screen.getByRole("button", { name: "Back" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "On" })).toBeInTheDocument();
      expect(screen.getByRole("radiogroup", { name: "H" })).toBeInTheDocument();
      expect(screen.getByRole("radiogroup", { name: "M" })).toBeInTheDocument();
      expect(screen.getByRole("radiogroup", { name: "P" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
    });

    it("shows the committed value selected in the calendar and the time panel", () => {
      renderField({ defaultValue: dt("2026-10-15T21:05") });
      fireEvent.click(toggle());
      expect(day("10/15/2026")).toHaveAttribute("aria-selected", "true");
      expect(option("Hour", "09")).toHaveAttribute("aria-checked", "true");
      expect(option("Minute", "05")).toHaveAttribute("aria-checked", "true");
      expect(option("AM/PM", "PM")).toHaveAttribute("aria-checked", "true");
    });

    it("keeps a typed minute off the time panel's grid selected", () => {
      renderField();
      enter("10/15/2026 9:07 PM");
      fireEvent.click(toggle());
      expect(option("Minute", "07")).toHaveAttribute("aria-checked", "true");
    });

    it("passes the minute step to the time panel", () => {
      renderField({ minuteStep: 15 });
      fireEvent.click(toggle());
      const minutes = within(screen.getByRole("radiogroup", { name: "Minute" })).getAllByRole("radio");
      expect(minutes.map((radio) => radio.textContent)).toEqual(["00", "15", "30", "45"]);
    });

    it("opens on the committed month, else today's", () => {
      const { unmount } = renderField({ defaultValue: dt("2027-03-09T10:00") });
      fireEvent.click(toggle());
      expect(day("03/09/2027")).toHaveAttribute("aria-selected", "true");
      unmount();

      renderField();
      fireEvent.click(toggle());
      expect(day("10/14/2026")).toHaveAttribute("aria-current", "date");
    });

    it("commits a picked day at the committed time and stays open", () => {
      const onChange = vi.fn();
      renderField({ defaultValue: dt("2026-10-15T21:05"), onChange });
      fireEvent.click(toggle());
      fireEvent.click(day("10/20/2026"));
      expect(onChange.mock.calls).toEqual([[dt("2026-10-20T21:05")]]);
      expect(shown()).toBe("10/20/2026 09:05 PM");
      expect(panel()).not.toBeNull();
    });

    it("commits a picked time on the committed day", () => {
      const onChange = vi.fn();
      renderField({ defaultValue: dt("2026-10-15T21:05"), onChange });
      fireEvent.click(toggle());
      fireEvent.click(option("Minute", "30"));
      expect(onChange.mock.calls).toEqual([[dt("2026-10-15T21:30")]]);
      expect(shown()).toBe("10/15/2026 09:30 PM");
    });

    it("disables the time panel until there is a day to put a time on", () => {
      renderField();
      fireEvent.click(toggle());
      expect(screen.getByRole("radiogroup", { name: "Hour" })).toHaveAttribute("aria-disabled", "true");
      fireEvent.click(day("10/20/2026"));
      expect(screen.getByRole("radiogroup", { name: "Hour" })).not.toHaveAttribute("aria-disabled");
    });

    it("holds a day picked on an empty field pending, then commits it with the picked time", () => {
      const onChange = vi.fn();
      const { container } = renderField({ name: "starts", onChange });
      fireEvent.click(toggle());
      fireEvent.click(day("10/20/2026"));
      expect(onChange).not.toHaveBeenCalled();
      expect(shown()).toBe("10/20/2026");
      expect(hidden(container)).toHaveValue("");
      expect(day("10/20/2026")).toHaveAttribute("aria-selected", "true");

      fireEvent.click(option("Hour", "09"));
      expect(onChange.mock.calls).toEqual([[dt("2026-10-20T09:00")]]);
      expect(shown()).toBe("10/20/2026 09:00 AM");
      expect(hidden(container)).toHaveValue("2026-10-20T09:00");
    });

    it("drops a pending day when the committed value's own day is picked again", () => {
      const onChange = vi.fn();
      renderField({ min: dt("2026-10-20T12:00"), defaultValue: dt("2026-10-21T10:00"), onChange });
      fireEvent.click(toggle());
      fireEvent.click(day("10/20/2026"));
      expect(shown()).toBe("10/20/2026");

      fireEvent.click(day("10/21/2026"));
      expect(onChange).not.toHaveBeenCalled();
      expect(shown()).toBe("10/21/2026 10:00 AM");
    });

    it("commits typed text over a pending day", () => {
      const onChange = vi.fn();
      renderField({ onChange });
      fireEvent.click(toggle());
      fireEvent.click(day("10/20/2026"));
      enter("10/20/2026 8:15 AM");
      expect(onChange.mock.calls).toEqual([[dt("2026-10-20T08:15")]]);
    });

    it("leaves a pending day alone on a blur of its untouched text", () => {
      const onChange = vi.fn();
      renderField({ onChange });
      fireEvent.click(toggle());
      fireEvent.click(day("10/20/2026"));
      focus(field());
      blur(field());
      expect(onChange).not.toHaveBeenCalled();
      expect(shown()).toBe("10/20/2026");
    });

    it("closes on Done and focuses the input", async () => {
      const onOpenChange = vi.fn();
      renderField({ onOpenChange });
      fireEvent.click(toggle());
      fireEvent.click(done());
      expect(onOpenChange.mock.calls).toEqual([[true], [false]]);
      await waitFor(() => expect(panel()).toBeNull());
      await waitFor(() => expect(field()).toHaveFocus());
    });

    it("opens at first with defaultOpen, and as a controlled open prop says", () => {
      const onOpenChange = vi.fn();
      const { rerender } = renderField({ open: true, onOpenChange });
      expect(panel()).not.toBeNull();
      fireEvent.click(done());
      expect(onOpenChange.mock.calls).toEqual([[false]]);
      expect(panel()).not.toBeNull();

      rerender(<DateTimeField aria-label="Starts" locale={enUS} today={TODAY} open={false} onOpenChange={onOpenChange} />);
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
      expect(panel()).toBeNull();
      expect(onOpenChange).not.toHaveBeenCalled();
    });
  });

  describe("a pending day", () => {
    it("is flagged only once focus leaves the whole field", async () => {
      renderField();
      fireEvent.click(toggle());
      fireEvent.click(day("10/20/2026"));
      focus(day("10/20/2026"));
      expect(isInvalid()).toBe(false);

      focus(option("Hour", "12"));
      expect(isInvalid()).toBe(false);

      fireEvent.click(done());
      await waitFor(() => expect(field()).toHaveFocus());
      expect(isInvalid()).toBe(false);

      focus(toggle());
      expect(isInvalid()).toBe(false);

      focus(outside());
      expect(isInvalid()).toBe(true);
    });

    it("is no longer flagged once focus comes back into the field", () => {
      renderField();
      fireEvent.click(toggle());
      fireEvent.click(day("10/20/2026"));
      focus(outside());
      expect(isInvalid()).toBe(true);

      focus(field());
      expect(isInvalid()).toBe(false);
    });

    it("is not flagged by a field left with nothing pending", () => {
      renderField({ defaultValue: dt("2026-10-15T21:05") });
      focus(field());
      focus(outside());
      expect(isInvalid()).toBe(false);
    });

    it("stays flagged by the caller's aria-invalid", () => {
      renderField({ "aria-invalid": true });
      expect(isInvalid()).toBe(true);
    });
  });

  describe("clear button", () => {
    it("is absent from an empty field", () => {
      renderField();
      expect(screen.queryByRole("button", { name: "Clear date and time" })).toBeNull();
    });

    it("clears the value, reports undefined and focuses the input", () => {
      const onChange = vi.fn();
      renderField({ defaultValue: dt("2026-10-15T21:05"), onChange, clearLabel: "Empty" });
      fireEvent.click(screen.getByRole("button", { name: "Empty" }));
      expect(onChange.mock.calls).toEqual([[undefined]]);
      expect(field()).toHaveValue("");
      expect(field()).toHaveFocus();
    });

    it("drops a pending day", () => {
      renderField();
      fireEvent.click(toggle());
      fireEvent.click(day("10/20/2026"));
      fireEvent.click(screen.getByRole("button", { name: "Clear date and time" }));
      expect(field()).toHaveValue("");
      focus(outside());
      expect(isInvalid()).toBe(false);
    });

    it("is absent from a disabled field, which leaves its value out of the form", () => {
      const { container } = renderField({ name: "starts", disabled: true, defaultValue: dt("2026-10-15T21:05") });
      expect(screen.queryByRole("button", { name: "Clear date and time" })).toBeNull();
      expect(field()).toBeDisabled();
      expect(hidden(container)).toBeDisabled();
    });
  });

  describe("controlled", () => {
    it("hands every commit to the parent, which decides the value", () => {
      const onChange = vi.fn();
      renderField({ value: dt("2026-10-15T21:05"), onChange });
      enter("10/16/2026 9:05 PM");
      expect(onChange.mock.calls).toEqual([[dt("2026-10-16T21:05")]]);
      expect(shown()).toBe("10/15/2026 09:05 PM");
    });

    it("follows a parent that takes the commit", () => {
      function Controlled() {
        const [value, setValue] = useState<LocalDateTime | undefined>(undefined);
        return <DateTimeField aria-label="Starts" locale={enUS} today={TODAY} value={value} onChange={setValue} />;
      }
      render(<Controlled />);
      fireEvent.click(toggle());
      fireEvent.click(day("10/20/2026"));
      fireEvent.click(option("Hour", "09"));
      expect(shown()).toBe("10/20/2026 09:00 AM");
      expect(option("Hour", "09")).toHaveAttribute("aria-checked", "true");
    });

    it("is a controlled empty field with value={undefined}", () => {
      const onChange = vi.fn();
      renderField({ value: undefined, onChange });
      enter("10/16/2026 9:05 PM");
      expect(onChange.mock.calls).toEqual([[dt("2026-10-16T21:05")]]);
      expect(field()).toHaveValue("");
    });

    it("shows a value the parent moves on to, dropping a rejected draft", () => {
      const { rerender } = renderField({ value: dt("2026-10-15T21:05") });
      enter("soon");
      expect(isInvalid()).toBe(true);

      rerender(<DateTimeField aria-label="Starts" locale={enUS} today={TODAY} value={dt("2026-10-16T08:00")} />);
      expect(shown()).toBe("10/16/2026 08:00 AM");
      expect(isInvalid()).toBe(false);
    });

    it("drops a pending day when the parent moves the value on", () => {
      const { rerender } = renderField({ value: undefined });
      fireEvent.click(toggle());
      fireEvent.click(day("10/20/2026"));
      expect(shown()).toBe("10/20/2026");

      rerender(<DateTimeField aria-label="Starts" locale={enUS} today={TODAY} value={dt("2026-10-16T08:00")} />);
      expect(shown()).toBe("10/16/2026 08:00 AM");
    });
  });
});
