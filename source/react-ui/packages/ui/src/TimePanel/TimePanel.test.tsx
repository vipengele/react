import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { LocaleProvider } from "@vipengele/react-tokens";
import { Locale, LocalTime } from "@vipengele/ts";
import { createRef, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { isOutOfBounds } from "../TimeField/timeSegments.js";
import { TimePanel, type TimePanelProps } from "./TimePanel.js";

// en-US counts hours 1-12 with AM and PM; de-DE counts 0-23.
const enUS = new Locale("en-US");
const deDE = new Locale("de-DE");
const time = (hour: number, minute: number, second = 0) => LocalTime.of(hour, minute, second);

function renderPanel(props: Partial<TimePanelProps> = {}) {
  return render(<TimePanel locale={enUS} {...props} />);
}

const strips = () => screen.getAllByRole("radiogroup");
const strip = (name: string) => screen.getByRole("radiogroup", { name });
const options = (name: string) => within(strip(name)).getAllByRole("radio");
const labels = (name: string) => options(name).map((option) => option.textContent);
const option = (stripName: string, label: string) => within(strip(stripName)).getByRole("radio", { name: label });
const hour = (label: string) => option("Hour", label);
const minute = (label: string) => option("Minute", label);
const period = (label: string) => option("AM/PM", label);
const checked = () => screen.getAllByRole("radio").filter((radio) => radio.getAttribute("aria-checked") === "true");
const tabStops = () => screen.getAllByRole("radio").filter((radio) => radio.tabIndex === 0);

/** Only the times from `min` to `max`, both inclusive, are allowed. */
const allowedBetween = (min: LocalTime, max: LocalTime) => (value: LocalTime) => isOutOfBounds(value, { min, max });

/** Real focus, not a synthesised event: focus moves are asserted against `activeElement`. */
const focus = (element: HTMLElement) => act(() => element.focus());
const press = (key: string) => fireEvent.keyDown(document.activeElement as Element, { key });

afterEach(() => {
  vi.restoreAllMocks();
});

describe("TimePanel", () => {
  describe("structure", () => {
    it("shows hour, minute and AM/PM strips in that order on a 12-hour locale", () => {
      renderPanel();
      expect(strips().map((group) => group.getAttribute("aria-label"))).toEqual(["Hour", "Minute", "AM/PM"]);
      expect(labels("Hour")).toEqual(["12", "01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11"]);
      expect(labels("Minute")).toEqual(["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"]);
      expect(labels("AM/PM")).toEqual(["AM", "PM"]);
    });

    it("shows 24 hours and no AM/PM strip on a 24-hour locale", () => {
      renderPanel({ locale: deDE });
      expect(strips().map((group) => group.getAttribute("aria-label"))).toEqual(["Hour", "Minute"]);
      expect(labels("Hour")).toHaveLength(24);
      expect(labels("Hour")[0]).toBe("00");
      expect(labels("Hour")[23]).toBe("23");
    });

    it("reads the nearest LocaleProvider without a locale prop", () => {
      render(
        <LocaleProvider locale={deDE}>
          <TimePanel />
        </LocaleProvider>,
      );
      expect(strips()).toHaveLength(2);
    });

    it("steps the minutes by minuteStep", () => {
      renderPanel({ minuteStep: 15 });
      expect(labels("Minute")).toEqual(["00", "15", "30", "45"]);
    });

    it("inserts an off-grid minute of the value in order and selects it", () => {
      renderPanel({ minuteStep: 15, defaultValue: time(10, 7) });
      expect(labels("Minute")).toEqual(["00", "07", "15", "30", "45"]);
      expect(minute("07")).toHaveAttribute("aria-checked", "true");
    });

    it("names the strips from the label props", () => {
      renderPanel({ hourLabel: "Stunde", minuteLabel: "Minute", dayPeriodLabel: "Tageszeit" });
      expect(strips().map((group) => group.getAttribute("aria-label"))).toEqual(["Stunde", "Minute", "Tageszeit"]);
    });

    it("puts ref, className and native attributes on the root", () => {
      const ref = createRef<HTMLDivElement>();
      renderPanel({ ref, className: "custom", "data-testid": "panel", id: "panel-id" } as Partial<TimePanelProps>);
      const root = screen.getByTestId("panel");
      expect(ref.current).toBe(root);
      expect(root).toHaveClass("vpg-time-panel", "custom");
      expect(root).toHaveAttribute("id", "panel-id");
    });

    it("injects one stylesheet under the vpg-time-panel href however many panels render", () => {
      render(
        <>
          <TimePanel locale={enUS} />
          <TimePanel locale={enUS} />
        </>,
      );
      // React hoists the style into `<head>` and rewrites `href` to `data-href`.
      const styles = document.head.querySelectorAll('style[data-href="vpg-time-panel"]');
      expect(styles).toHaveLength(1);
      expect(styles[0]?.textContent).toContain(".vpg-time-panel {");
    });
  });

  describe("selection", () => {
    it("checks no option while there is no time", () => {
      renderPanel();
      expect(checked()).toEqual([]);
      expect(screen.getAllByRole("radio").every((radio) => radio.getAttribute("aria-checked") === "false")).toBe(true);
    });

    it("checks the value's hour, minute and day period", () => {
      renderPanel({ defaultValue: time(21, 5) });
      expect(checked()).toEqual([hour("09"), minute("05"), period("PM")]);
    });

    it("shows a value with seconds by its hour and minute", () => {
      renderPanel({ defaultValue: time(9, 30, 45) });
      expect(checked().map((radio) => radio.textContent)).toEqual(["09", "30", "AM"]);
    });
  });

  describe("pointer picks", () => {
    it("completes the time from the first pick, filling the other strips with their first option", () => {
      const onChange = vi.fn();
      renderPanel({ onChange });
      fireEvent.click(minute("30"));
      expect(onChange).toHaveBeenCalledExactlyOnceWith(time(0, 30));
      expect(checked()).toEqual([hour("12"), minute("30"), period("AM")]);
    });

    it("changes only the picked strip, and an hour pick keeps PM", () => {
      const onChange = vi.fn();
      renderPanel({ defaultValue: time(14, 5), onChange });
      fireEvent.click(hour("03"));
      expect(onChange).toHaveBeenLastCalledWith(time(15, 5));
      fireEvent.click(minute("45"));
      expect(onChange).toHaveBeenLastCalledWith(time(15, 45));
      fireEvent.click(period("AM"));
      expect(onChange).toHaveBeenLastCalledWith(time(3, 45));
      expect(checked()).toEqual([hour("03"), minute("45"), period("AM")]);
    });

    it("picks a 24-hour hour directly", () => {
      const onChange = vi.fn();
      renderPanel({ locale: deDE, defaultValue: time(8, 0), onChange });
      fireEvent.click(hour("17"));
      expect(onChange).toHaveBeenCalledExactlyOnceWith(time(17, 0));
    });

    it("reports zero seconds when a pick lands on the value's own hour and minute", () => {
      const onChange = vi.fn();
      renderPanel({ defaultValue: time(10, 5, 30), onChange });
      fireEvent.click(minute("05"));
      expect(onChange).toHaveBeenCalledExactlyOnceWith(time(10, 5));
      const [[reported]] = onChange.mock.calls as [[LocalTime]];
      expect(reported.second).toBe(0);
    });

    it("commits nothing when the selected time is picked again", () => {
      const onChange = vi.fn();
      renderPanel({ defaultValue: time(10, 5), onChange });
      fireEvent.click(minute("05"));
      expect(onChange).not.toHaveBeenCalled();
    });

    it("marks an option no allowed time uses aria-disabled, and a pick of it commits nothing", () => {
      const onChange = vi.fn();
      renderPanel({ defaultValue: time(10, 0), isTimeDisabled: allowedBetween(time(9, 0), time(17, 0)), onChange });
      expect(hour("08")).toHaveAttribute("aria-disabled", "true");
      expect(hour("09")).not.toHaveAttribute("aria-disabled");
      fireEvent.click(hour("08"));
      expect(onChange).not.toHaveBeenCalled();
      expect(hour("10")).toHaveAttribute("aria-checked", "true");
    });

    it("moves the other strips to the nearest allowed time when the first pick lands outside it", () => {
      const onChange = vi.fn();
      renderPanel({ isTimeDisabled: allowedBetween(time(9, 0), time(17, 0)), onChange });
      fireEvent.click(minute("30"));
      expect(onChange).toHaveBeenCalledExactlyOnceWith(time(9, 30));
      expect(checked()).toEqual([hour("09"), minute("30"), period("AM")]);
    });

    it("ignores every pick while disabled and marks every option and strip disabled", () => {
      const onChange = vi.fn();
      renderPanel({ defaultValue: time(10, 0), disabled: true, onChange });
      expect(strips().every((group) => group.getAttribute("aria-disabled") === "true")).toBe(true);
      expect(screen.getAllByRole("radio").every((radio) => radio.getAttribute("aria-disabled") === "true")).toBe(true);
      fireEvent.click(minute("30"));
      expect(onChange).not.toHaveBeenCalled();
      expect(minute("00")).toHaveAttribute("aria-checked", "true");
    });
  });

  describe("controlled", () => {
    it("shows the value it is given and reports picks without changing it", () => {
      const onChange = vi.fn();
      renderPanel({ value: time(10, 0), onChange });
      fireEvent.click(minute("30"));
      expect(onChange).toHaveBeenCalledExactlyOnceWith(time(10, 30));
      expect(minute("00")).toHaveAttribute("aria-checked", "true");
      expect(minute("30")).toHaveAttribute("aria-checked", "false");
    });

    it("treats value={undefined} as a controlled panel with no time", () => {
      const onChange = vi.fn();
      renderPanel({ value: undefined, onChange });
      fireEvent.click(minute("30"));
      expect(onChange).toHaveBeenCalledExactlyOnceWith(time(0, 30));
      expect(checked()).toEqual([]);
    });

    it("follows the value when the caller updates it", () => {
      function Controlled() {
        const [value, setValue] = useState<LocalTime | undefined>(time(10, 0));
        return (
          <>
            <TimePanel locale={enUS} value={value} onChange={setValue} />
            <button type="button" onClick={() => setValue(time(18, 20))}>
              Evening
            </button>
          </>
        );
      }
      render(<Controlled />);
      fireEvent.click(minute("15"));
      expect(minute("15")).toHaveAttribute("aria-checked", "true");
      fireEvent.click(screen.getByRole("button", { name: "Evening" }));
      expect(checked()).toEqual([hour("06"), minute("20"), period("PM")]);
    });
  });

  describe("scrolling", () => {
    it("scrolls each strip's selected option into view on mount", () => {
      const scrolled = vi.spyOn(Element.prototype, "scrollIntoView");
      renderPanel({ defaultValue: time(21, 40) });
      expect(scrolled.mock.contexts).toEqual([hour("09"), minute("40"), period("PM")]);
      expect(scrolled).toHaveBeenCalledWith({ block: "nearest", inline: "nearest" });
    });

    it("scrolls nothing on mount without a time", () => {
      const scrolled = vi.spyOn(Element.prototype, "scrollIntoView");
      renderPanel();
      expect(scrolled).not.toHaveBeenCalled();
    });

    it("scrolls the selected options into view when the value changes from outside", () => {
      const { rerender } = renderPanel({ value: time(10, 0) });
      const scrolled = vi.spyOn(Element.prototype, "scrollIntoView");
      rerender(<TimePanel locale={enUS} value={time(10, 0)} />);
      expect(scrolled).not.toHaveBeenCalled();
      rerender(<TimePanel locale={enUS} value={time(23, 55)} />);
      expect(scrolled.mock.contexts).toEqual([hour("11"), minute("55"), period("PM")]);
    });

    it("scrolls the focused option into view", () => {
      renderPanel();
      const scrolled = vi.spyOn(Element.prototype, "scrollIntoView");
      focus(minute("50"));
      expect(scrolled.mock.contexts).toEqual([minute("50")]);
    });
  });

  describe("tab stop", () => {
    it("holds one tab stop on the first hour option while there is no time", () => {
      renderPanel();
      expect(tabStops()).toEqual([hour("12")]);
    });

    it("holds one tab stop on the selected hour", () => {
      renderPanel({ defaultValue: time(15, 10) });
      expect(tabStops()).toEqual([hour("03")]);
    });

    it("moves the tab stop with focus", () => {
      renderPanel({ defaultValue: time(15, 10) });
      focus(minute("30"));
      expect(tabStops()).toEqual([minute("30")]);
    });

    it("falls back to the selected option of the strip focused last once focus leaves", () => {
      render(
        <>
          <TimePanel locale={enUS} defaultValue={time(15, 10)} />
          <button type="button">After</button>
        </>,
      );
      focus(minute("10"));
      press("ArrowRight");
      press("ArrowRight");
      expect(minute("20")).toHaveFocus();
      focus(screen.getByRole("button", { name: "After" }));
      expect(tabStops()).toEqual([minute("10")]);
    });

    it("falls back to the first option of an empty strip focused last", () => {
      render(
        <>
          <TimePanel locale={enUS} />
          <button type="button">After</button>
        </>,
      );
      focus(period("PM"));
      focus(screen.getByRole("button", { name: "After" }));
      expect(tabStops()).toEqual([period("AM")]);
    });

    it("falls back to the strip's selected option when the focused option is no longer rendered", () => {
      const { rerender } = render(<TimePanel locale={enUS} value={time(10, 7)} />);
      focus(minute("07"));
      expect(tabStops()).toEqual([minute("07")]);
      rerender(<TimePanel locale={enUS} value={time(10, 0)} />);
      expect(tabStops()).toEqual([minute("00")]);
    });

    it("falls back to the first strip when the strip focused last is no longer rendered", () => {
      const { rerender } = render(
        <>
          <TimePanel locale={enUS} value={time(10, 0)} />
          <button type="button">After</button>
        </>,
      );
      focus(period("AM"));
      focus(screen.getByRole("button", { name: "After" }));
      rerender(
        <>
          <TimePanel locale={deDE} value={time(10, 0)} />
          <button type="button">After</button>
        </>,
      );
      expect(tabStops()).toEqual([hour("10")]);
    });

    it("leaves every option out of the tab order while disabled", () => {
      renderPanel({ defaultValue: time(10, 0), disabled: true });
      expect(screen.getAllByRole("radio").filter((radio) => radio.tabIndex === 0)).toEqual([]);
    });
  });

  describe("keyboard", () => {
    it("moves within a strip with Left and Right, stopping at its ends", () => {
      renderPanel({ defaultValue: time(10, 5) });
      focus(minute("05"));
      press("ArrowRight");
      expect(minute("10")).toHaveFocus();
      press("ArrowLeft");
      press("ArrowLeft");
      expect(minute("00")).toHaveFocus();
      press("ArrowLeft");
      expect(minute("00")).toHaveFocus();
      expect(tabStops()).toEqual([minute("00")]);
    });

    it("jumps to a strip's ends with Home and End", () => {
      renderPanel({ defaultValue: time(10, 5) });
      focus(hour("10"));
      press("End");
      expect(hour("11")).toHaveFocus();
      press("Home");
      expect(hour("12")).toHaveFocus();
      press("ArrowRight");
      press("End");
      press("ArrowRight");
      expect(hour("11")).toHaveFocus();
    });

    it("moves between strips with Up and Down, landing on the selected option", () => {
      renderPanel({ defaultValue: time(22, 35) });
      focus(hour("10"));
      press("ArrowRight");
      press("ArrowDown");
      expect(minute("35")).toHaveFocus();
      press("ArrowDown");
      expect(period("PM")).toHaveFocus();
      press("ArrowDown");
      expect(period("PM")).toHaveFocus();
      press("ArrowUp");
      press("ArrowUp");
      expect(hour("10")).toHaveFocus();
      press("ArrowUp");
      expect(hour("10")).toHaveFocus();
    });

    it("lands on a strip's first option when it has no selection", () => {
      renderPanel();
      focus(hour("12"));
      press("ArrowDown");
      expect(minute("00")).toHaveFocus();
    });

    it("stays put at the last strip of a 24-hour panel", () => {
      renderPanel({ locale: deDE, defaultValue: time(17, 5) });
      focus(minute("05"));
      press("ArrowDown");
      expect(minute("05")).toHaveFocus();
    });

    it("picks the focused option with Enter and with Space", () => {
      const onChange = vi.fn();
      renderPanel({ defaultValue: time(10, 5), onChange });
      focus(minute("05"));
      press("ArrowRight");
      expect(press("Enter")).toBe(false);
      expect(onChange).toHaveBeenLastCalledWith(time(10, 10));
      press("ArrowDown");
      press("ArrowRight");
      expect(press(" ")).toBe(false);
      expect(onChange).toHaveBeenLastCalledWith(time(22, 10));
      expect(checked()).toEqual([hour("10"), minute("10"), period("PM")]);
    });

    it("focuses an aria-disabled option and commits nothing on Enter", () => {
      const onChange = vi.fn();
      renderPanel({ defaultValue: time(10, 0), isTimeDisabled: allowedBetween(time(9, 0), time(17, 0)), onChange });
      focus(hour("09"));
      press("ArrowLeft");
      expect(hour("08")).toHaveFocus();
      press("Enter");
      expect(onChange).not.toHaveBeenCalled();
    });

    it("leaves keys it does not handle alone", () => {
      renderPanel({ defaultValue: time(10, 0) });
      focus(hour("10"));
      expect(press("Tab")).toBe(true);
      expect(press("a")).toBe(true);
      expect(hour("10")).toHaveFocus();
    });

    it("prevents the default of every key it moves on", () => {
      renderPanel({ defaultValue: time(10, 0) });
      focus(hour("10"));
      for (const key of ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"]) {
        expect(press(key)).toBe(false);
      }
    });
  });
});
