import { cleanup, render, screen, within } from "@testing-library/react";
import { ThemeProvider } from "@vipengele/react-tokens";
import { Locale, LocalTime } from "@vipengele/ts";
import { afterEach, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import { TimePanel, type TimePanelProps } from "./TimePanel.js";

// The chromium project has no setup file, so nothing auto-cleans between tests the way the
// jsdom project's does; without this every render after the first collides with the previous
// one and queries start matching more than one panel.
afterEach(cleanup);

const enUS = new Locale("en-US");
const time = (hour: number, minute: number) => LocalTime.of(hour, minute);

/**
 * A panel between two plain buttons, under a real `ThemeProvider`, narrow enough that a strip of
 * one-minute options overflows and scrolls.
 */
function Page(props: Partial<TimePanelProps>) {
  return (
    <ThemeProvider>
      <button type="button">Before</button>
      <TimePanel locale={enUS} minuteStep={1} style={{ width: "240px" }} {...props} />
      <button type="button">After</button>
    </ThemeProvider>
  );
}

const strip = (name: string) => screen.getByRole("radiogroup", { name });
const option = (stripName: string, label: string) => within(strip(stripName)).getByRole("radio", { name: label });
const hour = (label: string) => option("Hour", label);
const minute = (label: string) => option("Minute", label);
const button = (name: string) => screen.getByRole("button", { name });
const tabStops = () => screen.getAllByRole("radio").filter((radio) => radio.tabIndex === 0);

/** Whether `element` lies wholly inside the visible box of the strip that scrolls it. */
function isInView(element: HTMLElement, stripName: string): boolean {
  const outer = strip(stripName).getBoundingClientRect();
  const inner = element.getBoundingClientRect();
  return inner.left >= outer.left - 0.5 && inner.right <= outer.right + 0.5;
}

/** What `value` resolves to as a colour inside the themed root. */
function resolvedColour(value: string) {
  const probe = document.createElement("div");
  probe.style.color = value;
  (document.querySelector(".vpg-root") as HTMLElement).append(probe);
  const result = getComputedStyle(probe).color;
  probe.remove();
  return result;
}

describe("TimePanel scrolling", () => {
  it("lays a strip out as one row that overflows rather than wrapping", () => {
    render(<Page />);
    const minutes = strip("Minute");
    expect(minutes.scrollWidth).toBeGreaterThan(minutes.clientWidth);
    const tops = within(minutes)
      .getAllByRole("radio")
      .map((radio) => Math.round(radio.getBoundingClientRect().top));
    expect(new Set(tops).size).toBe(1);
  });

  it("scrolls the selected option into view on mount", () => {
    render(<Page defaultValue={time(10, 45)} />);
    expect(strip("Minute").scrollLeft).toBeGreaterThan(0);
    expect(isInView(minute("45"), "Minute")).toBe(true);
    expect(isInView(hour("10"), "Hour")).toBe(true);
  });

  it("scrolls the selected option into view when the value changes from outside", () => {
    const { rerender } = render(<Page value={time(10, 0)} />);
    expect(strip("Minute").scrollLeft).toBe(0);
    rerender(<Page value={time(10, 58)} />);
    expect(isInView(minute("58"), "Minute")).toBe(true);
    rerender(<Page value={time(10, 2)} />);
    expect(isInView(minute("02"), "Minute")).toBe(true);
  });

  it("scrolls the focused option into view as the keys move it", async () => {
    render(<Page defaultValue={time(10, 0)} />);
    minute("00").focus();
    await userEvent.keyboard("{End}");
    expect(minute("59")).toHaveFocus();
    expect(isInView(minute("59"), "Minute")).toBe(true);
    await userEvent.keyboard("{Home}");
    expect(isInView(minute("00"), "Minute")).toBe(true);
  });
});

describe("TimePanel focus", () => {
  it("draws the accent ring on an option that takes keyboard focus", async () => {
    render(<Page defaultValue={time(10, 0)} />);
    button("Before").focus();
    await userEvent.tab();

    expect(hour("10")).toHaveFocus();
    const style = getComputedStyle(hour("10"));
    expect(style.outlineStyle).toBe("solid");
    expect(Number.parseFloat(style.outlineWidth)).toBeGreaterThan(0);
    expect(style.outlineColor).toBe(resolvedColour("var(--vpg-accent-ring)"));
    expect(Number.parseFloat(style.outlineOffset)).toBeLessThan(0);
  });

  it("is one tab stop for every strip", async () => {
    render(<Page defaultValue={time(10, 0)} />);
    expect(tabStops()).toEqual([hour("10")]);
    button("Before").focus();

    await userEvent.tab();
    expect(hour("10")).toHaveFocus();
    await userEvent.tab();
    expect(button("After")).toHaveFocus();
    await userEvent.tab({ shift: true });
    expect(hour("10")).toHaveFocus();
    await userEvent.tab({ shift: true });
    expect(button("Before")).toHaveFocus();
  });

  it("leaves the panel in one Tab from any option a key moved to", async () => {
    render(<Page defaultValue={time(10, 30)} />);
    hour("10").focus();
    await userEvent.keyboard("{ArrowDown}");
    await userEvent.keyboard("{ArrowLeft}");
    await userEvent.keyboard("{ArrowLeft}");
    expect(minute("28")).toHaveFocus();

    await userEvent.tab();
    expect(button("After")).toHaveFocus();
    await userEvent.tab({ shift: true });
    expect(minute("30")).toHaveFocus();
    expect(tabStops()).toEqual([minute("30")]);
  });
});
