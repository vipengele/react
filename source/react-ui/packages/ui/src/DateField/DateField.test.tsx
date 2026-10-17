import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { LocaleProvider } from "@vipengele/react-tokens";
import { Locale, LocalDate } from "@vipengele/ts";
import { createRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { DateField, type DateFieldProps } from "./DateField.js";

// Every test passes a locale and a fixed `today` unless it is about the defaults, so nothing
// depends on the machine's locale or the day the suite runs. en-US writes month/day/year and
// de-DE day.month.year, so the two between them pin the segment order.
const enUS = new Locale("en-US");
const deDE = new Locale("de-DE");
const ptPT = new Locale("pt-PT");
const date = (year: number, month: number, day: number) => LocalDate.of(year, month, day);
const TODAY = date(2026, 10, 14);

function renderField(props: Partial<DateFieldProps> = {}) {
  return render(<DateField aria-label="Due" locale={enUS} today={TODAY} {...props} />);
}

const field = () => screen.getByRole("textbox", { name: "Due" }) as HTMLInputElement;
/** The input carrying the form value. It has no role, so no query in `screen` reaches it. */
const hidden = (container: HTMLElement) =>
  [...container.querySelectorAll("input")].find((input) => input.type === "hidden") as HTMLInputElement;
const clearButton = (name = "Clear date") => screen.getByRole("button", { name });
const queryClearButton = () => screen.queryByRole("button", { name: "Clear date" });
/** The calendar button, looked up by class. */
const toggle = () => document.querySelector(".vpg-date-field-calendar-toggle") as HTMLButtonElement;
/** The open calendar's surface, the `Popover` panel. */
const queryDialog = () => document.querySelector(".vpg-date-field-panel");
/** A day of the open calendar, by the name the calendar gives it. */
const day = (name: string) => screen.getByRole("gridcell", { name });
const heading = () => (document.querySelector(".vpg-calendar-heading") as HTMLElement).textContent;

const popoverPanel = () => document.querySelector(".vpg-date-field-panel");

/** Real focus, not a synthesised event: focus moves are asserted against `activeElement`. */
const focus = (element: HTMLElement) => act(() => element.focus());
const blur = (element: HTMLElement) => act(() => element.blur());
const type = (element: HTMLElement, text: string) => fireEvent.change(element, { target: { value: text } });
/** Puts the caret at `offset` and presses `key` there. */
const pressAt = (offset: number, key: "ArrowUp" | "ArrowDown") => {
  field().setSelectionRange(offset, offset);
  return fireEvent.keyDown(field(), { key });
};

describe("DateField", () => {
  describe("structure", () => {
    it("renders one text input, marked as the shell's growing control", () => {
      renderField({ className: "custom" });
      expect(field()).toHaveAttribute("type", "text");
      expect(field()).toHaveAttribute("autocomplete", "off");
      expect(field()).toHaveClass("vpg-date-field", "vpg-field-shell-control", "custom");
      expect(field().parentElement).toHaveClass("vpg-field-shell");
    });

    it("forwards arbitrary attributes to the input", () => {
      renderField({ id: "due", placeholder: "mm/dd/yyyy", "aria-describedby": "hint" } as Partial<DateFieldProps>);
      expect(field()).toHaveAttribute("id", "due");
      expect(field()).toHaveAttribute("placeholder", "mm/dd/yyyy");
      expect(field()).toHaveAttribute("aria-describedby", "hint");
      expect(field().parentElement).not.toHaveAttribute("id");
    });

    it("injects its stylesheet once for any number of fields", () => {
      render(
        <>
          <DateField aria-label="Due" />
          <DateField aria-label="Start" />
        </>,
      );

      const styles = document.head.querySelectorAll('style[data-href="vpg-date-field"]');
      expect(styles).toHaveLength(1);
      expect(styles[0]?.textContent).toContain(".vpg-date-field {");
    });

    it("never assigns a --vpg-* custom property inline", () => {
      renderField({ defaultValue: TODAY });
      expect(field().getAttribute("style")).toBeNull();
      expect(clearButton().getAttribute("style")).toBeNull();
    });

    it("shows the committed value in the locale's numeric pattern", () => {
      renderField({ defaultValue: date(2026, 2, 3) });
      expect(field()).toHaveValue("02/03/2026");
    });

    it("describes the locale's field order", () => {
      renderField();
      expect(field()).toHaveAttribute("aria-description", "Format: month / day / year");
    });

    it("describes another locale's field order in that locale's order", () => {
      renderField({ locale: deDE });
      expect(field()).toHaveAttribute("aria-description", "Format: day / month / year");
    });

    it("lets a caller's own aria-description stand", () => {
      renderField({ "aria-description": "Format: MM/DD/YYYY" } as Partial<DateFieldProps>);
      expect(field()).toHaveAttribute("aria-description", "Format: MM/DD/YYYY");
    });
  });

  describe("format hint", () => {
    it("shows the locale's format as the placeholder", () => {
      renderField({ locale: ptPT });
      expect(field()).toHaveAttribute("placeholder", "dd/mm/yyyy");
    });

    it("follows the locale's field order", () => {
      renderField({ locale: enUS });
      expect(field()).toHaveAttribute("placeholder", "mm/dd/yyyy");
    });

    it("lets a caller's own placeholder stand", () => {
      renderField({ locale: ptPT, placeholder: "Pick a day" });
      expect(field()).toHaveAttribute("placeholder", "Pick a day");
    });
  });

  describe("typing separators", () => {
    it("adds the separator once a day or month is complete", () => {
      renderField({ locale: ptPT });
      focus(field());
      type(field(), "1");
      expect(field()).toHaveValue("1");
      type(field(), "10");
      expect(field()).toHaveValue("10/");
      type(field(), "10/1");
      type(field(), "10/10");
      expect(field()).toHaveValue("10/10/");
    });

    it("commits the date typed digit by digit without a separator", () => {
      const onChange = vi.fn();
      renderField({ locale: ptPT, onChange });
      focus(field());
      for (const text of ["1", "10", "10/1", "10/10", "10/10/2", "10/10/20", "10/10/202", "10/10/2026"]) {
        type(field(), text);
      }
      expect(field()).toHaveValue("10/10/2026");
      blur(field());
      expect(onChange).toHaveBeenCalledWith(date(2026, 10, 10));
    });

    it("accepts the separator typed by hand, and does not double it", () => {
      const onChange = vi.fn();
      renderField({ locale: ptPT, onChange });
      focus(field());
      type(field(), "1");
      type(field(), "10");
      type(field(), "10/");
      expect(field()).toHaveValue("10/");
      type(field(), "10//");
      expect(field()).toHaveValue("10/");
      type(field(), "10/1");
      type(field(), "10/10");
      type(field(), "10/10/");
      expect(field()).toHaveValue("10/10/");
      type(field(), "10/10/2026");
      blur(field());
      expect(onChange).toHaveBeenCalledWith(date(2026, 10, 10));
    });

    it("leaves a paste untouched", () => {
      renderField({ locale: ptPT });
      focus(field());
      type(field(), "10/10/2026");
      expect(field()).toHaveValue("10/10/2026");
    });

    it("adds no separator when a character is deleted", () => {
      renderField({ locale: ptPT });
      focus(field());
      type(field(), "1");
      type(field(), "10");
      type(field(), "10/1");
      type(field(), "10/");
      expect(field()).toHaveValue("10/");
      type(field(), "10");
      expect(field()).toHaveValue("10");
    });

    it("keeps the raw text while composing and applies the rule once, from the text the composition began on", () => {
      renderField({ locale: new Locale("ko-KR") });
      focus(field());
      type(field(), "2026. 1");
      fireEvent.compositionStart(field());
      fireEvent.input(field(), { target: { value: "2026. 10" }, isComposing: true });
      expect(field()).toHaveValue("2026. 10");
      fireEvent.compositionEnd(field());
      expect(field()).toHaveValue("2026. 10. ");
    });
  });

  describe("committing", () => {
    it("reports nothing per keystroke", () => {
      const onChange = vi.fn();
      renderField({ onChange });

      focus(field());
      type(field(), "10/2");
      type(field(), "10/20/2026");
      expect(onChange).not.toHaveBeenCalled();
    });

    it("commits on blur", () => {
      const onChange = vi.fn();
      renderField({ onChange });

      focus(field());
      type(field(), "10/20/2026");
      blur(field());
      expect(onChange).toHaveBeenCalledWith(date(2026, 10, 20));
      expect(field()).toHaveValue("10/20/2026");
    });

    it("reformats unpadded text it reads", () => {
      const onChange = vi.fn();
      renderField({ onChange });

      focus(field());
      type(field(), "1/2/2026");
      blur(field());
      expect(onChange).toHaveBeenCalledWith(date(2026, 1, 2));
      expect(field()).toHaveValue("01/02/2026");
    });

    it("reads a pasted ISO 8601 date in any locale", () => {
      const onChange = vi.fn();
      renderField({ locale: deDE, onChange });

      focus(field());
      type(field(), "2026-10-01");
      blur(field());
      expect(onChange).toHaveBeenCalledWith(date(2026, 10, 1));
      expect(field()).toHaveValue("01.10.2026");
    });

    it("commits on Enter", () => {
      const onChange = vi.fn();
      renderField({ onChange });

      focus(field());
      type(field(), "10/20/2026");
      expect(fireEvent.keyDown(field(), { key: "Enter" })).toBe(true);
      expect(onChange).toHaveBeenCalledWith(date(2026, 10, 20));
    });

    it("has the form value in the DOM before Enter's own handler returns", () => {
      // The browser's implicit submission reads the hidden input in this same tick. Reading it
      // from a handler that runs after the component's own proves the commit was flushed rather
      // than left to React's end-of-event batch.
      let valueDuringKeyDown: string | undefined;
      const { container } = render(
        <form>
          <DateField
            aria-label="Due"
            locale={enUS}
            name="due"
            onKeyDown={() => {
              valueDuringKeyDown = hidden(container).value;
            }}
          />
        </form>,
      );

      focus(field());
      type(field(), "10/20/2026");
      fireEvent.keyDown(field(), { key: "Enter" });
      expect(valueDuringKeyDown).toBe("2026-10-20");
    });

    it("ignores an Enter that ends an IME composition", () => {
      const onChange = vi.fn();
      renderField({ onChange });

      focus(field());
      type(field(), "10/20/2026");
      fireEvent.keyDown(field(), { key: "Enter", isComposing: true });
      expect(onChange).not.toHaveBeenCalled();

      fireEvent.keyDown(field(), { key: "Enter" });
      expect(onChange).toHaveBeenCalledWith(date(2026, 10, 20));
    });

    it("re-reads nothing when the text has not moved since the last commit", () => {
      const onChange = vi.fn();
      renderField({ defaultValue: TODAY, onChange });

      focus(field());
      blur(field());
      expect(onChange).not.toHaveBeenCalled();
    });

    it("commits an emptied field as no value, and does not call that a mistake", () => {
      const onChange = vi.fn();
      const { container } = renderField({ name: "due", defaultValue: TODAY, onChange });

      focus(field());
      type(field(), "  ");
      blur(field());
      expect(onChange).toHaveBeenCalledWith(undefined);
      expect(field()).toHaveValue("");
      expect(field()).not.toHaveAttribute("aria-invalid");
      expect(hidden(container)).toHaveValue("");
    });

    it("keeps text that reads as no date on screen, flags it and commits nothing", () => {
      const onChange = vi.fn();
      const { container } = renderField({ name: "due", defaultValue: TODAY, onChange });

      focus(field());
      type(field(), "13/45/2026");
      blur(field());
      expect(onChange).not.toHaveBeenCalled();
      expect(field()).toHaveValue("13/45/2026");
      expect(field()).toHaveAttribute("aria-invalid", "true");
      expect(hidden(container)).toHaveValue("2026-10-14");
    });

    it("commits nothing on a second blur of the same rejected text", () => {
      const onChange = vi.fn();
      renderField({ onChange });

      focus(field());
      type(field(), "soon");
      blur(field());
      focus(field());
      blur(field());
      expect(onChange).not.toHaveBeenCalled();
      expect(field()).toHaveValue("soon");
    });

    it("clears the flag once the text reads as a date again", () => {
      renderField();

      focus(field());
      type(field(), "soon");
      blur(field());
      focus(field());
      type(field(), "10/20/2026");
      blur(field());
      expect(field()).not.toHaveAttribute("aria-invalid");
      expect(field()).toHaveValue("10/20/2026");
    });

    it.each([
      ["before min", "01/01/2026"],
      ["after max", "12/31/2026"],
      ["disabled", "10/18/2026"],
    ])("rejects a typed date %s", (_, text) => {
      const onChange = vi.fn();
      renderField({ min: date(2026, 2, 1), max: date(2026, 11, 30), isDateDisabled: (d) => d.dayOfWeek === 7, onChange });

      focus(field());
      type(field(), text);
      blur(field());
      expect(onChange).not.toHaveBeenCalled();
      expect(field()).toHaveValue(text);
      expect(field()).toHaveAttribute("aria-invalid", "true");
    });

    it("accepts the bounds themselves", () => {
      const onChange = vi.fn();
      renderField({ min: date(2026, 2, 1), max: date(2026, 11, 30), onChange });

      focus(field());
      type(field(), "02/01/2026");
      blur(field());
      focus(field());
      type(field(), "11/30/2026");
      blur(field());
      expect(onChange.mock.calls).toEqual([[date(2026, 2, 1)], [date(2026, 11, 30)]]);
    });
  });

  describe("stepping", () => {
    it("steps the segment under the caret", () => {
      const onChange = vi.fn();
      renderField({ defaultValue: date(2026, 10, 14), onChange });

      focus(field());
      pressAt(0, "ArrowUp");
      expect(onChange).toHaveBeenLastCalledWith(date(2026, 11, 14));
      pressAt(4, "ArrowUp");
      expect(onChange).toHaveBeenLastCalledWith(date(2026, 11, 15));
      pressAt(8, "ArrowDown");
      expect(onChange).toHaveBeenLastCalledWith(date(2025, 11, 15));
      expect(field()).toHaveValue("11/15/2025");
    });

    it("selects the stepped segment", () => {
      renderField({ defaultValue: date(2026, 10, 14) });

      focus(field());
      pressAt(4, "ArrowUp");
      expect([field().selectionStart, field().selectionEnd]).toEqual([3, 5]);
    });

    it("steps from the text on screen rather than the last committed value", () => {
      const onChange = vi.fn();
      renderField({ defaultValue: TODAY, onChange });

      focus(field());
      type(field(), "01/31/2026");
      pressAt(0, "ArrowUp");
      expect(onChange).toHaveBeenCalledWith(date(2026, 2, 28));
    });

    it("steps an empty field onto today", () => {
      const onChange = vi.fn();
      renderField({ onChange });

      focus(field());
      pressAt(0, "ArrowDown");
      expect(onChange).toHaveBeenCalledWith(TODAY);
      expect([field().selectionStart, field().selectionEnd]).toEqual([0, 2]);
    });

    it("steps onto the real today when none is given", () => {
      const onChange = vi.fn();
      render(<DateField aria-label="Due" locale={enUS} onChange={onChange} />);

      focus(field());
      pressAt(0, "ArrowUp");
      expect(onChange).toHaveBeenCalledWith(LocalDate.now());
    });

    it("stops at the bounds", () => {
      const onChange = vi.fn();
      renderField({ defaultValue: date(2026, 10, 14), min: date(2026, 10, 1), max: date(2026, 10, 20), onChange });

      focus(field());
      pressAt(0, "ArrowUp");
      expect(onChange).toHaveBeenLastCalledWith(date(2026, 10, 20));
      pressAt(8, "ArrowDown");
      expect(onChange).toHaveBeenLastCalledWith(date(2026, 10, 1));
    });

    it("walks past a disabled date", () => {
      const onChange = vi.fn();
      renderField({ defaultValue: date(2026, 10, 17), isDateDisabled: (d) => d.dayOfWeek === 7, onChange });

      focus(field());
      pressAt(4, "ArrowUp");
      expect(onChange).toHaveBeenCalledWith(date(2026, 10, 19));
    });

    it("refuses a step that lands on no date the field accepts", () => {
      const onChange = vi.fn();
      renderField({ defaultValue: TODAY, isDateDisabled: () => true, onChange });

      focus(field());
      expect(pressAt(4, "ArrowUp")).toBe(false);
      expect(onChange).not.toHaveBeenCalled();
      expect(field()).toHaveValue("10/14/2026");
    });

    it("steps nothing while the text names no segment", () => {
      const onChange = vi.fn();
      renderField({ defaultValue: TODAY, onChange });

      focus(field());
      type(field(), "10/14");
      expect(pressAt(2, "ArrowUp")).toBe(false);
      expect(onChange).not.toHaveBeenCalled();
      expect(field()).toHaveValue("10/14");
    });

    it("leaves every other key alone", () => {
      const onChange = vi.fn();
      renderField({ defaultValue: TODAY, onChange });

      expect(fireEvent.keyDown(field(), { key: "ArrowLeft" })).toBe(true);
      expect(onChange).not.toHaveBeenCalled();
    });

    it("steps without an onChange handler", () => {
      renderField({ defaultValue: TODAY });
      focus(field());
      pressAt(4, "ArrowUp");
      expect(field()).toHaveValue("10/15/2026");
    });

    it("places no selection when the box does not take the stepped date", () => {
      // Unfocused and controlled, the box shows the parent's value, and this parent keeps it empty.
      const onChange = vi.fn();
      renderField({ value: undefined, onChange });

      pressAt(0, "ArrowUp");
      expect(onChange).toHaveBeenCalledWith(TODAY);
      expect(field()).toHaveValue("");
    });

    it("steps nothing in a read-only field", () => {
      const onChange = vi.fn();
      renderField({ defaultValue: TODAY, readOnly: true, onChange });

      focus(field());
      expect(pressAt(4, "ArrowUp")).toBe(true);
      fireEvent.keyDown(field(), { key: "Enter" });
      expect(onChange).not.toHaveBeenCalled();
      expect(field()).toHaveAttribute("readonly");
    });
  });

  describe("clear button", () => {
    it("is absent while the field is empty", () => {
      renderField();
      expect(queryClearButton()).toBeNull();
    });

    it("is present while there is a value", () => {
      renderField({ defaultValue: TODAY });
      expect(clearButton()).toHaveAttribute("type", "button");
      expect(clearButton().closest(".vpg-field-shell-trailing")).not.toBeNull();
    });

    it("is present while there is text and no value", () => {
      renderField();
      focus(field());
      type(field(), "10/");
      expect(clearButton()).toBeInTheDocument();
    });

    it("empties the field, commits no value and returns focus to the input", () => {
      const onChange = vi.fn();
      const { container } = renderField({ name: "due", defaultValue: TODAY, onChange });

      fireEvent.click(clearButton());
      expect(onChange.mock.calls).toEqual([[undefined]]);
      expect(field()).toHaveValue("");
      expect(hidden(container)).toHaveValue("");
      expect(document.activeElement).toBe(field());
      expect(queryClearButton()).toBeNull();
    });

    it("drops an edit in progress with a single commit", () => {
      const onChange = vi.fn();
      renderField({ defaultValue: TODAY, onChange });

      focus(field());
      type(field(), "soon");
      blur(field());
      expect(field()).toHaveAttribute("aria-invalid", "true");

      fireEvent.click(clearButton());
      expect(onChange.mock.calls).toEqual([[undefined]]);
      expect(field()).toHaveValue("");
      expect(field()).not.toHaveAttribute("aria-invalid");
    });

    it("stops a press from moving focus off the input", () => {
      renderField({ defaultValue: TODAY });
      expect(fireEvent.mouseDown(clearButton())).toBe(false);
    });

    it("takes its accessible name from clearLabel", () => {
      renderField({ defaultValue: TODAY, clearLabel: "Datum löschen" });
      expect(clearButton("Datum löschen")).toBeInTheDocument();
    });

    it("is absent from a disabled or read-only field", () => {
      const { rerender } = renderField({ defaultValue: TODAY, disabled: true });
      expect(queryClearButton()).toBeNull();
      rerender(<DateField aria-label="Due" locale={enUS} defaultValue={TODAY} readOnly />);
      expect(queryClearButton()).toBeNull();
    });
  });

  describe("controlled", () => {
    it("leaves the edit under the caret alone when the value changes", () => {
      const { rerender } = renderField({ value: TODAY });

      focus(field());
      type(field(), "10/2");
      rerender(<DateField aria-label="Due" locale={enUS} value={date(2026, 1, 1)} />);
      expect(field()).toHaveValue("10/2");
    });

    it("shows the new value once focus has left", () => {
      const { rerender } = renderField({ value: TODAY });
      rerender(<DateField aria-label="Due" locale={enUS} value={date(2026, 1, 1)} />);
      expect(field()).toHaveValue("01/01/2026");
    });

    it("reverts to the value the parent kept when a commit is not adopted", () => {
      const onChange = vi.fn();
      renderField({ value: TODAY, onChange });

      focus(field());
      type(field(), "10/20/2026");
      blur(field());
      expect(onChange).toHaveBeenCalledWith(date(2026, 10, 20));
      expect(field()).toHaveValue("10/14/2026");
    });

    it("adopts what a parent stores", () => {
      function Controlled() {
        const [due, setDue] = useState<LocalDate | undefined>(TODAY);
        return <DateField aria-label="Due" locale={enUS} value={due} onChange={setDue} />;
      }
      render(<Controlled />);

      focus(field());
      type(field(), "2026-12-01");
      blur(field());
      expect(field()).toHaveValue("12/01/2026");
    });

    it("clears a stuck invalid flag once a parent moves the value on", () => {
      const { rerender } = renderField({ value: TODAY });

      focus(field());
      type(field(), "soon");
      blur(field());
      expect(field()).toHaveAttribute("aria-invalid", "true");

      rerender(<DateField aria-label="Due" locale={enUS} value={date(2026, 1, 1)} />);
      expect(field()).toHaveValue("01/01/2026");
      expect(field()).not.toHaveAttribute("aria-invalid");
    });

    it("clears a stuck invalid flag on blur when the value moved on while still focused", () => {
      const { rerender } = renderField({ value: TODAY });

      focus(field());
      type(field(), "soon");
      fireEvent.keyDown(field(), { key: "Enter" });
      expect(field()).toHaveAttribute("aria-invalid", "true");

      rerender(<DateField aria-label="Due" locale={enUS} value={date(2026, 1, 1)} />);
      expect(field()).toHaveValue("soon");

      blur(field());
      expect(field()).toHaveValue("01/01/2026");
      expect(field()).not.toHaveAttribute("aria-invalid");
    });

    it("keeps the flag when a parent passes the same date again", () => {
      const { rerender } = renderField({ value: TODAY });

      focus(field());
      type(field(), "soon");
      blur(field());

      rerender(<DateField aria-label="Due" locale={enUS} value={date(2026, 10, 14)} />);
      expect(field()).toHaveValue("soon");
      expect(field()).toHaveAttribute("aria-invalid", "true");
    });

    it("is controlled and empty with value={undefined}", () => {
      const onChange = vi.fn();
      renderField({ value: undefined, defaultValue: TODAY, onChange });
      expect(field()).toHaveValue("");

      focus(field());
      type(field(), "10/20/2026");
      blur(field());
      expect(onChange).toHaveBeenCalledWith(date(2026, 10, 20));
      expect(field()).toHaveValue("");
    });
  });

  describe("invalid", () => {
    it("flags a committed value outside the bounds", () => {
      renderField({ value: date(2025, 1, 1), min: date(2026, 1, 1) });
      expect(field()).toHaveAttribute("aria-invalid", "true");
    });

    it("flags a committed value the caller disables", () => {
      renderField({ defaultValue: TODAY, isDateDisabled: (d) => d.equals(TODAY) });
      expect(field()).toHaveAttribute("aria-invalid", "true");
    });

    it("leaves an accepted value unflagged", () => {
      renderField({ defaultValue: TODAY, min: date(2026, 1, 1), max: date(2026, 12, 31) });
      expect(field()).not.toHaveAttribute("aria-invalid");
    });

    it("honours a caller's own aria-invalid", () => {
      renderField({ defaultValue: TODAY, "aria-invalid": true });
      expect(field()).toHaveAttribute("aria-invalid", "true");
    });
  });

  describe("hidden input", () => {
    it("carries the name and the ISO 8601 value", () => {
      const { container } = renderField({ name: "due", defaultValue: date(2026, 2, 3) });
      expect(hidden(container)).toHaveAttribute("name", "due");
      expect(hidden(container)).toHaveValue("2026-02-03");
      expect(field()).not.toHaveAttribute("name");
    });

    it("carries nothing when there is no value", () => {
      const { container } = renderField({ name: "due" });
      expect(hidden(container)).toHaveValue("");
    });

    it("is disabled with the field", () => {
      const { container } = renderField({ name: "due", defaultValue: TODAY, disabled: true });
      expect(field()).toBeDisabled();
      expect(hidden(container)).toBeDisabled();
    });
  });

  describe("locale", () => {
    it("formats at the nearest provider's locale", () => {
      render(
        <LocaleProvider locale={deDE}>
          <DateField aria-label="Due" value={TODAY} />
        </LocaleProvider>,
      );
      expect(field()).toHaveValue("14.10.2026");
    });

    it("lets the locale prop win over the provider", () => {
      render(
        <LocaleProvider locale={deDE}>
          <DateField aria-label="Due" locale={enUS} value={TODAY} />
        </LocaleProvider>,
      );
      expect(field()).toHaveValue("10/14/2026");
    });

    it("reads and steps in the resolved locale's segment order", () => {
      const onChange = vi.fn();
      renderField({ locale: deDE, onChange });

      focus(field());
      type(field(), "14.10.2026");
      pressAt(0, "ArrowUp");
      expect(onChange).toHaveBeenCalledWith(date(2026, 10, 15));
    });
  });

  describe("ref and handlers", () => {
    it("points an object ref at the visible input", () => {
      const ref = createRef<HTMLInputElement>();
      renderField({ name: "due", ref });
      expect(ref.current).toBe(field());
    });

    it("points a callback ref at the visible input", () => {
      const seen: (HTMLInputElement | null)[] = [];
      renderField({
        ref: (node) => {
          seen.push(node);
        },
      });
      expect(seen[0]).toBe(field());
    });

    it("calls a caller's focus, blur and keydown handlers", () => {
      const onFocus = vi.fn();
      const onBlur = vi.fn();
      const onKeyDown = vi.fn();
      renderField({ defaultValue: TODAY, onFocus, onBlur, onKeyDown });

      focus(field());
      pressAt(4, "ArrowUp");
      blur(field());
      expect(onFocus).toHaveBeenCalledTimes(1);
      expect(onKeyDown).toHaveBeenCalledTimes(1);
      expect(onBlur).toHaveBeenCalledTimes(1);
    });
  });

  describe("calendar pop-up", () => {
    it("opens from a button at the field's start", () => {
      renderField();
      expect(toggle()).toHaveAttribute("type", "button");
      expect(toggle()).toHaveAccessibleName("Choose date");
      expect(toggle().closest(".vpg-field-shell-leading")).not.toBeNull();
      expect(toggle().querySelector("svg")).toHaveAttribute("aria-hidden", "true");
      expect(toggle()).not.toHaveAttribute("aria-haspopup");
      expect(toggle()).toHaveAttribute("aria-expanded", "false");
      expect(queryDialog()).toBeNull();

      fireEvent.click(toggle());
      expect(popoverPanel()).toContainElement(screen.getByRole("grid"));
      expect(toggle()).toHaveAttribute("aria-expanded", "true");
    });

    it("opens a non-modal panel: the page stays exposed and the panel is no dialog", () => {
      renderField();
      fireEvent.click(toggle());
      expect(screen.queryByRole("dialog")).toBeNull();
      expect(popoverPanel()).not.toHaveAttribute("aria-modal");
      // `field()` looks the input up by role, which finds nothing under an `aria-hidden` ancestor.
      expect(field().closest("[aria-hidden='true'], [inert]")).toBeNull();
    });

    it("closes on a second press of the button", async () => {
      const onOpenChange = vi.fn();
      renderField({ onOpenChange });
      fireEvent.click(toggle());
      fireEvent.click(toggle());
      await waitFor(() => expect(queryDialog()).toBeNull());
      expect(onOpenChange.mock.calls).toEqual([[true], [false]]);
    });

    it("never opens from the text input", () => {
      renderField();
      focus(field());
      type(field(), "10/");
      fireEvent.click(field());
      fireEvent.keyDown(field(), { key: "ArrowDown" });
      expect(queryDialog()).toBeNull();
    });

    it("names its button and the calendar's month buttons from their label props", () => {
      renderField({ openCalendarLabel: "Datum wählen", previousMonthLabel: "Voriger Monat", nextMonthLabel: "Nächster Monat" });
      expect(toggle()).toHaveAccessibleName("Datum wählen");
      fireEvent.click(toggle());
      expect(screen.getByRole("button", { name: "Voriger Monat" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Nächster Monat" })).toBeInTheDocument();
    });

    it("shows the committed date selected and passes the bounds and disabled dates through", () => {
      renderField({
        defaultValue: TODAY,
        min: date(2026, 10, 5),
        max: date(2026, 10, 25),
        isDateDisabled: (candidate) => candidate.day === 20,
      });
      fireEvent.click(toggle());
      expect(day("10/14/2026")).toHaveAttribute("aria-selected", "true");
      expect(day("10/14/2026")).toHaveAttribute("aria-current", "date");
      expect(day("10/04/2026")).toHaveAttribute("aria-disabled", "true");
      expect(day("10/26/2026")).toHaveAttribute("aria-disabled", "true");
      expect(day("10/20/2026")).toHaveAttribute("aria-disabled", "true");
      expect(day("10/21/2026")).not.toHaveAttribute("aria-disabled");
    });

    it("writes the calendar in the field's locale", () => {
      render(<DateField aria-label="Due" locale={deDE} today={TODAY} defaultValue={TODAY} />);
      fireEvent.click(toggle());
      expect(heading()).toBe("Oktober 2026");
      expect(day("14.10.2026")).toHaveAttribute("aria-selected", "true");
    });

    it("commits a picked date, closes and focuses the input", async () => {
      const onChange = vi.fn();
      const onOpenChange = vi.fn();
      const { container } = renderField({ name: "due", defaultValue: TODAY, onChange, onOpenChange });

      fireEvent.click(toggle());
      fireEvent.click(day("10/20/2026"));
      expect(onChange.mock.calls).toEqual([[date(2026, 10, 20)]]);
      expect(onOpenChange.mock.calls).toEqual([[true], [false]]);
      await waitFor(() => expect(queryDialog()).toBeNull());
      expect(field()).toHaveValue("10/20/2026");
      expect(hidden(container)).toHaveValue("2026-10-20");
      await waitFor(() => expect(document.activeElement).toBe(field()));
    });

    it("replaces a rejected draft with the picked date", () => {
      const onChange = vi.fn();
      renderField({ defaultValue: TODAY, onChange });
      focus(field());
      type(field(), "soon");
      blur(field());
      expect(field()).toHaveAttribute("aria-invalid", "true");

      fireEvent.click(toggle());
      expect(day("10/14/2026")).toHaveAttribute("aria-selected", "true");
      fireEvent.click(day("10/02/2026"));
      expect(onChange.mock.calls).toEqual([[date(2026, 10, 2)]]);
      expect(field()).toHaveValue("10/02/2026");
      expect(field()).not.toHaveAttribute("aria-invalid");
    });

    it("hands a pick to a controlled parent, which decides the value", () => {
      const onChange = vi.fn();
      renderField({ value: TODAY, onChange });
      fireEvent.click(toggle());
      fireEvent.click(day("10/20/2026"));
      expect(onChange.mock.calls).toEqual([[date(2026, 10, 20)]]);
      expect(field()).toHaveValue("10/14/2026");
    });

    it("follows month navigation while open and starts over on the next opening", async () => {
      renderField({ defaultValue: TODAY });
      fireEvent.click(toggle());
      fireEvent.click(screen.getByRole("button", { name: "Next month" }));
      expect(heading()).toBe("November 2026");

      fireEvent.keyDown(document, { key: "Escape" });
      await waitFor(() => expect(queryDialog()).toBeNull());
      fireEvent.click(toggle());
      expect(heading()).toBe("October 2026");
    });

    it("opens at first with defaultOpen", () => {
      renderField({ defaultOpen: true });
      expect(popoverPanel()).toBeInTheDocument();
    });

    it("opens and closes only as a controlled open prop says", () => {
      const onOpenChange = vi.fn();
      const { rerender } = renderField({ open: true, onOpenChange });
      expect(popoverPanel()).toBeInTheDocument();

      fireEvent.click(toggle());
      expect(onOpenChange.mock.calls).toEqual([[false]]);
      expect(popoverPanel()).toBeInTheDocument();

      rerender(<DateField aria-label="Due" locale={enUS} today={TODAY} open={false} onOpenChange={onOpenChange} />);
      expect(queryDialog()).toBeNull();
    });

    it("lets a controlled parent close it on a pick", () => {
      function Controlled() {
        const [open, setOpen] = useState(false);
        return <DateField aria-label="Due" locale={enUS} today={TODAY} open={open} onOpenChange={setOpen} />;
      }
      render(<Controlled />);
      fireEvent.click(toggle());
      fireEvent.click(day("10/20/2026"));
      expect(queryDialog()).toBeNull();
      expect(field()).toHaveValue("10/20/2026");
    });

    it.each([
      ["disabled", { disabled: true }],
      ["read-only", { readOnly: true }],
    ] as const)("does not open in a %s field", (_, state) => {
      const onOpenChange = vi.fn();
      renderField({ ...state, defaultOpen: true, onOpenChange });
      expect(toggle()).toBeDisabled();
      expect(queryDialog()).toBeNull();

      fireEvent.click(toggle());
      expect(queryDialog()).toBeNull();
      expect(onOpenChange).not.toHaveBeenCalled();
    });

    it("hides a controlled open pop-up while the field is disabled", () => {
      renderField({ open: true, disabled: true });
      expect(queryDialog()).toBeNull();
    });

    it("never assigns a --vpg-* custom property inline on its button", () => {
      renderField();
      expect(toggle().getAttribute("style")).toBeNull();
    });
  });
});
