import { act, fireEvent, render, screen } from "@testing-library/react";
import { Locale, LocalDateTime } from "@vipengele/ts";
import { createRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { FormField } from "../FormField/FormField.js";
import { DateTimeField, type DateTimeFieldProps } from "./DateTimeField.js";

// en-US writes dates month/day/year and times on a 12-hour clock, whatever the runtime's own
// locale is.
const enUS = new Locale("en-US");
const dt = (iso: string) => LocalDateTime.parse(iso);

/** A US-English field labelled "Starts". */
function Field(props: DateTimeFieldProps) {
  return <DateTimeField aria-label="Starts" locale={enUS} {...props} />;
}

const group = () => screen.getByRole("group", { name: "Starts" });
const dateInput = () => screen.getByRole("textbox", { name: "Date" }) as HTMLInputElement;
const timeGroup = () => screen.getByRole("group", { name: "Time" });
const segment = (label: "Hour" | "Minute" | "Second" | "AM/PM") => screen.getByRole("spinbutton", { name: label });
/** Every input carrying a form value. They have no role, so no query in `screen` reaches them. */
const hiddenInputs = (container: HTMLElement) => [...container.querySelectorAll("input")].filter((input) => input.type === "hidden");
/** The one hidden input that carries a name. The halves render unnamed hidden inputs of their own. */
const named = (container: HTMLElement) => hiddenInputs(container).find((input) => input.hasAttribute("name")) as HTMLInputElement;

/** Real focus, not a synthesised event: leaving the group is judged by where focus lands. */
const focus = (element: HTMLElement) => act(() => element.focus());
const blur = (element: HTMLElement) => act(() => element.blur());
/** Presses each character of `keys` on whichever segment holds focus when it is pressed. */
const typeKeys = (keys: string) => {
  for (const key of keys) {
    fireEvent.keyDown(document.activeElement as HTMLElement, { key });
  }
};

/** Types `text` into the date half and commits it with Enter, leaving focus in the input. */
function enterDate(text: string) {
  focus(dateInput());
  fireEvent.change(dateInput(), { target: { value: text } });
  fireEvent.keyDown(dateInput(), { key: "Enter" });
}

/** Types a time into the time half; filling its last segment commits it. */
function enterTime(keys: string) {
  focus(segment("Hour"));
  typeKeys(keys);
}

const iso = (value: LocalDateTime | undefined) => value?.toString();
const isInvalid = (element: HTMLElement) => element.getAttribute("aria-invalid") === "true";

describe("DateTimeField", () => {
  describe("structure", () => {
    it("renders a group holding a date half and a time half", () => {
      render(<Field className="custom" style={{ maxWidth: "30rem" }} />);
      expect(group()).toHaveClass("vpg-date-time-field", "custom");
      expect(group().style.maxWidth).toBe("30rem");
      expect(group()).toContainElement(dateInput());
      expect(group()).toContainElement(timeGroup());
    });

    it("names the halves Date and Time unless told otherwise", () => {
      render(<Field dateLabel="Start date" timeLabel="Start time" />);
      expect(screen.getByRole("textbox", { name: "Start date" })).toBeInTheDocument();
      expect(screen.getByRole("group", { name: "Start time" })).toBeInTheDocument();
    });

    it("forwards its ref to the group", () => {
      const ref = createRef<HTMLDivElement>();
      render(<Field ref={ref} />);
      expect(ref.current).toBe(group());
    });

    it("injects its stylesheet once for any number of fields", () => {
      render(
        <>
          <Field />
          <DateTimeField aria-label="Ends" locale={enUS} />
        </>,
      );
      const styles = document.head.querySelectorAll('style[data-href="vpg-date-time-field"]');
      expect(styles).toHaveLength(1);
      expect(styles[0]?.textContent).toContain(".vpg-date-time-field {");
    });

    it("shows its default value in both halves", () => {
      render(<Field defaultValue={dt("2026-10-01T09:30")} />);
      expect(dateInput()).toHaveValue("10/01/2026");
      expect(segment("Hour")).toHaveTextContent("09");
      expect(segment("Minute")).toHaveTextContent("30");
      expect(segment("AM/PM")).toHaveTextContent("AM");
    });

    it("forwards seconds to the time half", () => {
      render(<Field seconds defaultValue={dt("2026-10-01T09:30:15")} />);
      expect(segment("Second")).toHaveTextContent("15");
    });
  });

  describe("form value", () => {
    it("submits the committed date-time through one named hidden input", () => {
      const { container } = render(<Field name="starts" defaultValue={dt("2026-10-01T09:30")} />);
      expect(named(container)).toHaveAttribute("name", "starts");
      expect(named(container)).toHaveValue("2026-10-01T09:30");
      const names = hiddenInputs(container).map((input) => input.getAttribute("name"));
      expect(names.filter((name) => name !== null)).toEqual(["starts"]);
    });

    it("writes the second only when it is non-zero", () => {
      const { container } = render(<Field name="starts" seconds defaultValue={dt("2026-10-01T09:30:15")} />);
      expect(named(container)).toHaveValue("2026-10-01T09:30:15");
    });

    it("submits an empty string while there is no value", () => {
      const { container } = render(<Field name="starts" />);
      expect(named(container)).toHaveValue("");
    });

    it("leaves a disabled field out of the submission and disables both halves", () => {
      const { container } = render(<Field name="starts" disabled defaultValue={dt("2026-10-01T09:30")} />);
      expect(named(container)).toBeDisabled();
      expect(dateInput()).toBeDisabled();
      expect(timeGroup()).toHaveAttribute("aria-disabled", "true");
    });
  });

  describe("committing", () => {
    it("reports nothing until both halves are filled, then the date-time they spell", () => {
      const onChange = vi.fn();
      const { container } = render(<Field name="starts" onChange={onChange} />);

      enterDate("10/01/2026");
      expect(onChange).not.toHaveBeenCalled();
      expect(named(container)).toHaveValue("");

      enterTime("930a");
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(iso(onChange.mock.calls[0]?.[0])).toBe("2026-10-01T09:30");
      expect(named(container)).toHaveValue("2026-10-01T09:30");
    });

    it("invents no time for a date on its own", () => {
      const onChange = vi.fn();
      const { container } = render(<Field name="starts" onChange={onChange} />);
      enterDate("10/01/2026");
      blur(dateInput());
      expect(onChange).not.toHaveBeenCalled();
      expect(named(container)).toHaveValue("");
      expect(segment("Hour")).toHaveAttribute("data-empty");
    });

    it("reports a new date-time when one half of a complete value changes", () => {
      const onChange = vi.fn();
      render(<Field defaultValue={dt("2026-10-01T09:30")} onChange={onChange} />);
      enterDate("10/02/2026");
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(iso(onChange.mock.calls[0]?.[0])).toBe("2026-10-02T09:30");
    });

    it("clears a complete value when its date is emptied, keeping the time on screen", () => {
      const onChange = vi.fn();
      const { container } = render(<Field name="starts" defaultValue={dt("2026-10-01T09:30")} onChange={onChange} />);
      fireEvent.click(screen.getByRole("button", { name: "Clear date" }));
      expect(onChange).toHaveBeenCalledExactlyOnceWith(undefined);
      expect(named(container)).toHaveValue("");
      expect(segment("Hour")).toHaveTextContent("09");
    });

    it("clears a complete value when its time is emptied, keeping the date on screen", () => {
      const onChange = vi.fn();
      const { container } = render(<Field name="starts" defaultValue={dt("2026-10-01T09:30")} onChange={onChange} />);
      for (const label of ["Hour", "Minute", "AM/PM"] as const) {
        focus(segment(label));
        fireEvent.keyDown(segment(label), { key: "Backspace" });
      }
      blur(segment("AM/PM"));
      expect(onChange).toHaveBeenCalledExactlyOnceWith(undefined);
      expect(named(container)).toHaveValue("");
      expect(dateInput()).toHaveValue("10/01/2026");
    });

    it("reports the date-time again once the emptied half is filled back in", () => {
      const onChange = vi.fn();
      render(<Field defaultValue={dt("2026-10-01T09:30")} onChange={onChange} />);
      fireEvent.click(screen.getByRole("button", { name: "Clear date" }));
      enterDate("10/03/2026");
      expect(onChange).toHaveBeenCalledTimes(2);
      expect(iso(onChange.mock.calls[1]?.[0])).toBe("2026-10-03T09:30");
    });
  });

  describe("accessibility wiring", () => {
    it("puts the group's name and description on the group and its id on the date input", () => {
      render(
        <>
          <span id="label">Starts</span>
          <span id="hint">Local time</span>
          <DateTimeField locale={enUS} id="starts" aria-labelledby="label" aria-describedby="hint" />
        </>,
      );
      const root = screen.getByRole("group", { name: "Starts" });
      expect(root).toHaveAttribute("aria-describedby", "hint");
      expect(root).not.toHaveAttribute("id");
      expect(dateInput()).toHaveAttribute("id", "starts");
    });

    it("takes FormField's label, description and invalid state", () => {
      render(
        <FormField label="Starts" hint="Local time" error="Required">
          <DateTimeField locale={enUS} />
        </FormField>,
      );
      const root = screen.getByRole("group", { name: "Starts" });
      expect(root).toHaveAccessibleDescription("Local time Required");
      expect(screen.getByText("Starts")).toHaveAttribute("for", dateInput().id);
      expect(isInvalid(dateInput())).toBe(true);
      expect(isInvalid(timeGroup())).toBe(true);
    });

    it("flags both halves invalid when the caller says so", () => {
      render(<Field aria-invalid defaultValue={dt("2026-10-01T09:30")} />);
      expect(isInvalid(dateInput())).toBe(true);
      expect(isInvalid(timeGroup())).toBe(true);
    });

    it("flags neither half invalid by default", () => {
      render(<Field defaultValue={dt("2026-10-01T09:30")} />);
      expect(isInvalid(dateInput())).toBe(false);
      expect(isInvalid(timeGroup())).toBe(false);
    });
  });

  describe("half-filled", () => {
    it("is not flagged while focus moves from one half to the other", () => {
      render(<Field />);
      enterDate("10/01/2026");
      focus(segment("Hour"));
      expect(isInvalid(dateInput())).toBe(false);
      expect(isInvalid(timeGroup())).toBe(false);
    });

    it("flags both halves once focus leaves the group with one half filled", () => {
      render(<Field />);
      enterDate("10/01/2026");
      focus(segment("Hour"));
      blur(segment("Hour"));
      expect(isInvalid(dateInput())).toBe(true);
      expect(isInvalid(timeGroup())).toBe(true);
    });

    it("drops the flag when focus comes back into the group", () => {
      render(<Field />);
      enterDate("10/01/2026");
      blur(dateInput());
      expect(isInvalid(dateInput())).toBe(true);
      focus(segment("Hour"));
      expect(isInvalid(dateInput())).toBe(false);
    });

    it("flags nothing when focus leaves an empty or a complete field", () => {
      const { rerender } = render(<Field />);
      focus(dateInput());
      blur(dateInput());
      expect(isInvalid(dateInput())).toBe(false);

      rerender(<Field key="complete" defaultValue={dt("2026-10-01T09:30")} />);
      focus(dateInput());
      blur(dateInput());
      expect(isInvalid(dateInput())).toBe(false);
      expect(isInvalid(timeGroup())).toBe(false);
    });
  });

  describe("bounds", () => {
    const min = dt("2026-10-01T09:00");
    const max = dt("2026-10-05T17:00");

    it("rejects a date outside the bounds' dates in the date half", () => {
      const onChange = vi.fn();
      render(<Field min={min} max={max} defaultValue={dt("2026-10-03T12:00")} onChange={onChange} />);
      enterDate("09/30/2026");
      expect(isInvalid(dateInput())).toBe(true);
      enterDate("10/06/2026");
      expect(isInvalid(dateInput())).toBe(true);
      expect(onChange).not.toHaveBeenCalled();
    });

    it("bounds the time on min's own date", () => {
      const onChange = vi.fn();
      render(<Field min={min} max={max} onChange={onChange} />);
      enterDate("10/01/2026");
      enterTime("830a");
      expect(isInvalid(timeGroup())).toBe(true);
      expect(onChange).not.toHaveBeenCalled();
    });

    it("bounds the time on max's own date", () => {
      const onChange = vi.fn();
      render(<Field min={min} max={max} onChange={onChange} />);
      enterDate("10/05/2026");
      enterTime("530p");
      expect(isInvalid(timeGroup())).toBe(true);
      expect(onChange).not.toHaveBeenCalled();
    });

    it("leaves the time free on a date strictly between the bounds", () => {
      const onChange = vi.fn();
      render(<Field min={min} max={max} onChange={onChange} />);
      enterDate("10/02/2026");
      enterTime("830a");
      expect(isInvalid(timeGroup())).toBe(false);
      expect(iso(onChange.mock.calls[0]?.[0])).toBe("2026-10-02T08:30");
    });

    it("reports nothing and flags both halves when a date joins a time outside the bounds", () => {
      const onChange = vi.fn();
      const { container } = render(<Field name="starts" min={min} max={max} onChange={onChange} />);
      enterTime("830a");
      enterDate("10/01/2026");
      expect(onChange).not.toHaveBeenCalled();
      expect(named(container)).toHaveValue("");
      expect(isInvalid(dateInput())).toBe(true);
      expect(isInvalid(timeGroup())).toBe(true);
    });

    it("keeps the committed value when an edit moves it outside the bounds", () => {
      const onChange = vi.fn();
      const { container } = render(<Field name="starts" min={min} max={max} defaultValue={dt("2026-10-02T08:30")} onChange={onChange} />);
      enterDate("10/01/2026");
      expect(onChange).not.toHaveBeenCalled();
      expect(named(container)).toHaveValue("2026-10-02T08:30");
      expect(isInvalid(dateInput())).toBe(true);
    });

    it("commits a time rejected on min's date once the date moves to one strictly between the bounds", () => {
      const onChange = vi.fn();
      const { container } = render(<Field name="starts" min={min} max={max} onChange={onChange} />);
      enterDate("10/01/2026");
      enterTime("830a");
      expect(isInvalid(timeGroup())).toBe(true);
      expect(onChange).not.toHaveBeenCalled();

      enterDate("10/02/2026");
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(iso(onChange.mock.calls[0]?.[0])).toBe("2026-10-02T08:30");
      expect(named(container)).toHaveValue("2026-10-02T08:30");
      expect(isInvalid(timeGroup())).toBe(false);
      expect(isInvalid(dateInput())).toBe(false);
    });

    it("keeps the committed value when a half is emptied after a rejected edit", () => {
      const onChange = vi.fn();
      const { container } = render(<Field name="starts" min={min} max={max} defaultValue={dt("2026-10-02T08:30")} onChange={onChange} />);
      enterDate("10/01/2026");
      for (const label of ["Hour", "Minute", "AM/PM"] as const) {
        focus(segment(label));
        fireEvent.keyDown(segment(label), { key: "Backspace" });
      }
      blur(segment("AM/PM"));
      expect(onChange).not.toHaveBeenCalled();
      expect(named(container)).toHaveValue("2026-10-02T08:30");
      expect(dateInput()).toHaveValue("10/01/2026");
    });

    it("reseeds from a parent's value after a half is emptied following a rejected edit", () => {
      const onChange = vi.fn();
      const props = { name: "starts", min, max, onChange };
      const { container, rerender } = render(<Field {...props} value={dt("2026-10-02T08:30")} />);
      enterDate("10/01/2026");
      fireEvent.click(screen.getByRole("button", { name: "Clear date" }));
      expect(onChange).not.toHaveBeenCalled();
      expect(named(container)).toHaveValue("2026-10-02T08:30");
      blur(document.activeElement as HTMLElement);

      rerender(<Field {...props} value={dt("2026-10-03T10:00")} />);
      expect(dateInput()).toHaveValue("10/03/2026");
      expect(segment("Hour")).toHaveTextContent("10");
      expect(named(container)).toHaveValue("2026-10-03T10:00");
    });
  });

  describe("controlled", () => {
    it("keeps a half-filled field under value={undefined}", () => {
      const onChange = vi.fn();
      render(<Field value={undefined} onChange={onChange} />);
      enterDate("10/01/2026");
      blur(dateInput());
      expect(dateInput()).toHaveValue("10/01/2026");
      expect(onChange).not.toHaveBeenCalled();
    });

    it("keeps the other half when a cleared value comes back as undefined", () => {
      function Parent() {
        const [value, setValue] = useState<LocalDateTime | undefined>(dt("2026-10-01T09:30"));
        return <Field value={value} onChange={setValue} />;
      }
      render(<Parent />);
      fireEvent.click(screen.getByRole("button", { name: "Clear date" }));
      expect(dateInput()).toHaveValue("");
      expect(segment("Hour")).toHaveTextContent("09");
    });

    it("reseeds both halves when the parent passes a different date-time", () => {
      const { rerender } = render(<Field value={dt("2026-10-01T09:30")} />);
      rerender(<Field value={dt("2026-11-02T14:45")} />);
      expect(dateInput()).toHaveValue("11/02/2026");
      expect(segment("Hour")).toHaveTextContent("02");
      expect(segment("Minute")).toHaveTextContent("45");
      expect(segment("AM/PM")).toHaveTextContent("PM");
    });

    it("empties both halves when the parent clears a complete value", () => {
      const { rerender } = render(<Field value={dt("2026-10-01T09:30")} />);
      rerender(<Field value={undefined} />);
      expect(dateInput()).toHaveValue("");
      expect(segment("Hour")).toHaveAttribute("data-empty");
    });

    it("shows the parent's value again when the parent holds it over a reported one", () => {
      const onChange = vi.fn();
      const { container } = render(<Field name="starts" value={dt("2026-10-01T09:30")} onChange={onChange} />);
      enterDate("10/02/2026");
      blur(dateInput());
      expect(iso(onChange.mock.calls[0]?.[0])).toBe("2026-10-02T09:30");
      expect(dateInput()).toHaveValue("10/01/2026");
      expect(named(container)).toHaveValue("2026-10-01T09:30");
    });

    it("follows a parent that takes every reported value", () => {
      function Parent() {
        const [value, setValue] = useState<LocalDateTime | undefined>(undefined);
        return (
          <>
            <Field value={value} onChange={setValue} />
            <output>{value?.toString() ?? "none"}</output>
          </>
        );
      }
      render(<Parent />);
      enterDate("10/01/2026");
      enterTime("930a");
      expect(screen.getByRole("status")).toHaveTextContent("2026-10-01T09:30");
    });
  });
});
