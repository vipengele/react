import { LocaleProvider, ThemeProvider } from "@vipengele/react-tokens";
import { cleanup, render, screen } from "@testing-library/react";
import { Locale, LocalTime } from "@vipengele/ts";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cdp, userEvent } from "vitest/browser";
import { TimeField } from "./TimeField.js";

// The chromium project has no setup file, so nothing auto-cleans between tests the way the
// jsdom project's does; without this every render after the first collides with the previous
// one and queries start matching more than one field.
afterEach(cleanup);

const enUS = new Locale("en-US");

const group = () => screen.getByRole("group", { name: "Start" });
const segment = (label: "Hour" | "Minute" | "AM/PM") => screen.getByRole("spinbutton", { name: label });

/** The colour a `--vpg-*` role token resolves to, read by consuming it as a real property on a
 * probe inside the themed root — a custom property read back off `getPropertyValue` is its
 * unresolved token stream. */
function resolvedBackground(token: string): string {
  const probe = document.createElement("span");
  probe.style.backgroundColor = `var(${token})`;
  (document.querySelector(".vpg-root") as HTMLElement).append(probe);
  const colour = getComputedStyle(probe).backgroundColor;
  probe.remove();
  return colour;
}

/** The colour a `--vpg-*` role token resolves to as a text colour, read off a probe the way
 * `resolvedBackground` reads one. */
function resolvedColour(token: string): string {
  const probe = document.createElement("span");
  probe.style.color = `var(${token})`;
  (document.querySelector(".vpg-root") as HTMLElement).append(probe);
  const colour = getComputedStyle(probe).color;
  probe.remove();
  return colour;
}

/** The ring a field draws with the given ring colour token, resolved on a probe inside the themed
 * root. */
function resolvedRing(token: string): string {
  const probe = document.createElement("span");
  probe.style.boxShadow = `0 0 0 var(--vpg-focus-ring-width) var(${token})`;
  (document.querySelector(".vpg-root") as HTMLElement).append(probe);
  const shadow = getComputedStyle(probe).boxShadow;
  probe.remove();
  return shadow;
}

/** The style once its transitions have run, so a state change is read at its end value. */
function settledStyle(element: Element): CSSStyleDeclaration {
  for (const animation of element.getAnimations()) {
    animation.finish();
  }
  return getComputedStyle(element);
}

/** The test page's offset inside the top-level page, where CDP input coordinates are measured
 * from. */
function frameOffset(): { left: number; top: number } {
  const frame = window.frameElement?.getBoundingClientRect();
  return { left: frame?.left ?? 0, top: frame?.top ?? 0 };
}

/** A real touch tap through Chromium's input pipeline at `(x, y)` in the test page. */
async function tap(x: number, y: number) {
  const { left, top } = frameOffset();
  await cdp().send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 1 });
  try {
    await cdp().send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: left + x, y: top + y }] });
    await cdp().send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  } finally {
    await cdp().send("Emulation.setTouchEmulationEnabled", { enabled: false });
  }
}

/** A real touch tap at the centre of `element`. */
async function tapCentre(element: Element) {
  const rect = element.getBoundingClientRect();
  await tap(rect.left + rect.width / 2, rect.top + rect.height / 2);
}

/** Text inserted the way a virtual keyboard commits it: a real `beforeinput` of type `insertText`
 * on the focused element. */
async function insertText(text: string) {
  await cdp().send("Input.insertText", { text });
}

function Themed({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <LocaleProvider locale={enUS}>{children}</LocaleProvider>
    </ThemeProvider>
  );
}

describe("TimeField under a real ThemeProvider", () => {
  it("fills the field's height with its group, the shell's marked control", () => {
    render(
      <Themed>
        <TimeField aria-label="Start" defaultValue={LocalTime.of(9, 30)} />
      </Themed>,
    );
    const shell = group().parentElement as HTMLElement;
    expect(shell).toHaveClass("vpg-field-shell");
    expect(group().getBoundingClientRect().height).toBeCloseTo(shell.clientHeight, 0);
  });

  it("lays the segments out on one line in logical order", () => {
    render(
      <Themed>
        <TimeField aria-label="Start" defaultValue={LocalTime.of(9, 30)} />
      </Themed>,
    );
    const hour = segment("Hour").getBoundingClientRect();
    const minute = segment("Minute").getBoundingClientRect();
    const period = segment("AM/PM").getBoundingClientRect();
    expect(hour.right).toBeLessThanOrEqual(minute.left);
    expect(minute.right).toBeLessThanOrEqual(period.left);
    expect(hour.top).toBeCloseTo(minute.top, 0);
  });

  it("keeps a segment's width as its digits change", async () => {
    render(
      <Themed>
        <TimeField aria-label="Start" defaultValue={LocalTime.of(11, 11)} />
      </Themed>,
    );
    const before = segment("Minute").getBoundingClientRect().width;
    await userEvent.click(segment("Minute"));
    await userEvent.keyboard("{ArrowDown}");
    expect(segment("Minute")).toHaveTextContent("10");
    expect(segment("Minute").getBoundingClientRect().width).toBeCloseTo(before, 1);
  });

  it("fills the focused segment, whether focus arrived by pointer or keyboard", async () => {
    render(
      <Themed>
        <TimeField aria-label="Start" defaultValue={LocalTime.of(9, 30)} />
      </Themed>,
    );
    const wash = resolvedBackground("--vpg-accent-wash");
    await userEvent.click(segment("Minute"));
    expect(settledStyle(segment("Minute")).backgroundColor).toBe(wash);
    expect(settledStyle(segment("Hour")).backgroundColor).not.toBe(wash);

    await userEvent.tab({ shift: true });
    expect(document.activeElement).toBe(segment("Hour"));
    expect(settledStyle(segment("Hour")).backgroundColor).toBe(wash);
  });

  it("rings the field on keyboard focus but not on a pointer click", async () => {
    render(
      <Themed>
        <TimeField aria-label="Start" defaultValue={LocalTime.of(9, 30)} />
      </Themed>,
    );
    const shell = group().parentElement as HTMLElement;
    await userEvent.click(segment("Hour"));
    expect(settledStyle(shell).boxShadow).toBe("none");

    await userEvent.keyboard("{Tab}");
    expect(document.activeElement).toBe(segment("Minute"));
    expect(settledStyle(shell).boxShadow).not.toBe("none");
  });

  it("draws the danger border and ring around a typed time outside min, and keeps the border once focus leaves", async () => {
    const onChange = vi.fn();
    render(
      <Themed>
        <TimeField aria-label="Start" min={LocalTime.of(9, 0)} onChange={onChange} />
        <button type="button">After</button>
      </Themed>,
    );
    const shell = group().parentElement as HTMLElement;
    const danger = resolvedColour("--vpg-danger");
    await userEvent.tab();
    expect(document.activeElement).toBe(segment("Hour"));
    expect(settledStyle(shell).borderTopColor).not.toBe(danger);

    await userEvent.keyboard("0830a");
    expect(document.activeElement).toBe(segment("AM/PM"));
    expect(group()).toHaveAttribute("aria-invalid", "true");
    expect(settledStyle(shell).borderTopColor).toBe(danger);
    expect(settledStyle(shell).boxShadow).toBe(resolvedRing("--vpg-danger-ring"));

    await userEvent.tab();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "After" }));
    expect(settledStyle(shell).borderTopColor).toBe(danger);
    expect(settledStyle(shell).boxShadow).toBe("none");
    expect(segment("Hour").textContent).toBe("08");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("tabs through the segments in logical order and commits once focus leaves the field", async () => {
    const onChange = vi.fn();
    render(
      <Themed>
        <TimeField aria-label="Start" defaultValue={LocalTime.of(9, 30)} onChange={onChange} />
        <button type="button">After</button>
      </Themed>,
    );
    await userEvent.click(segment("Hour"));
    await userEvent.keyboard("{ArrowUp}");
    await userEvent.tab();
    expect(document.activeElement).toBe(segment("Minute"));
    await userEvent.keyboard("{Tab}");
    expect(document.activeElement).toBe(segment("AM/PM"));
    expect(onChange).not.toHaveBeenCalled();

    await userEvent.keyboard("{Tab}");
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "After" }));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0]?.[0]?.toString()).toBe("10:30");
  });

  it("follows the visual order with the arrows in a right-to-left document", async () => {
    render(
      <Themed>
        <div dir="rtl">
          <TimeField aria-label="Start" defaultValue={LocalTime.of(9, 30)} />
        </div>
      </Themed>,
    );
    // Logical order in the DOM, laid out right to left on screen.
    expect(segment("Hour").getBoundingClientRect().left).toBeGreaterThan(segment("Minute").getBoundingClientRect().left);

    await userEvent.click(segment("Hour"));
    await userEvent.keyboard("{ArrowLeft}");
    expect(document.activeElement).toBe(segment("Minute"));
    await userEvent.keyboard("{ArrowLeft}");
    expect(document.activeElement).toBe(segment("AM/PM"));
    await userEvent.keyboard("{ArrowRight}");
    expect(document.activeElement).toBe(segment("Minute"));
  });

  it("does not take focus on a pointer press while disabled", async () => {
    render(
      <Themed>
        <TimeField aria-label="Start" disabled defaultValue={LocalTime.of(9, 30)} />
      </Themed>,
    );
    // Playwright refuses to click inside an `aria-disabled` group unless forced, which is the point.
    await userEvent.click(segment("Hour"), { force: true });
    expect(document.activeElement).not.toBe(segment("Hour"));
    expect(settledStyle(group().parentElement as HTMLElement).opacity).toBe("0.55");
  });

  it("submits the committed ISO value through a native form submit", async () => {
    const submitted = vi.fn();
    render(
      <Themed>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            submitted(new FormData(event.currentTarget).get("start"));
          }}
        >
          <TimeField aria-label="Start" name="start" defaultValue={LocalTime.of(9, 30)} />
          <button type="submit">Save</button>
        </form>
      </Themed>,
    );
    await userEvent.click(segment("Minute"));
    await userEvent.keyboard("45");
    // Pressing the button moves focus out of the field first, which commits the edit.
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(submitted).toHaveBeenCalledWith("09:45");
  });

  it("takes digits and a period letter inserted the way a virtual keyboard inserts them", async () => {
    const onChange = vi.fn();
    render(
      <Themed>
        <TimeField aria-label="Start" name="start" onChange={onChange} />
      </Themed>,
    );
    await tapCentre(segment("Hour"));
    await expect.poll(() => document.activeElement).toBe(segment("Hour"));
    await insertText("9");
    await expect.poll(() => document.activeElement).toBe(segment("Minute"));
    expect(segment("Hour").textContent).toBe("09");
    await insertText("3");
    expect(segment("Minute").textContent).toBe("3");
    await insertText("0");
    await expect.poll(() => document.activeElement).toBe(segment("AM/PM"));
    await insertText("p");
    await expect.poll(() => onChange.mock.calls.length).toBe(1);
    expect(onChange.mock.calls[0]?.[0]?.toString()).toBe("21:30");
    expect(segment("Hour").textContent).toBe("09");
    expect(segment("Minute").textContent).toBe("30");
    expect(segment("AM/PM").textContent).toBe("PM");
  });

  it("keeps its own text through an IME composition the browser cannot be stopped from writing", async () => {
    render(
      <Themed>
        <TimeField aria-label="Start" defaultValue={LocalTime.of(9, 30)} />
      </Themed>,
    );
    await tapCentre(segment("AM/PM"));
    await expect.poll(() => document.activeElement).toBe(segment("AM/PM"));
    await cdp().send("Input.imeSetComposition", { text: "p", selectionStart: 1, selectionEnd: 1 });
    await expect.poll(() => segment("AM/PM").textContent).toBe("PM");
    await cdp().send("Input.insertText", { text: "" });
    await expect.poll(() => segment("AM/PM").textContent).toBe("PM");
    expect(segment("Hour").textContent).toBe("09");
  });

  it("focuses a segment a touch taps, which asks for a numeric keypad", async () => {
    render(
      <Themed>
        <TimeField aria-label="Start" defaultValue={LocalTime.of(9, 30)} />
      </Themed>,
    );
    await tapCentre(segment("Minute"));
    await expect.poll(() => document.activeElement).toBe(segment("Minute"));
    expect(segment("Minute").inputMode).toBe("numeric");
    expect(segment("Minute").isContentEditable).toBe(true);
    expect(segment("AM/PM").inputMode).toBe("text");
  });

  it("focuses the first empty segment when a touch taps the field outside every segment", async () => {
    render(
      <Themed>
        <TimeField aria-label="Start" />
      </Themed>,
    );
    const shell = (group().parentElement as HTMLElement).getBoundingClientRect();
    await tap(shell.right - 2, shell.top + shell.height / 2);
    await expect.poll(() => document.activeElement).toBe(segment("Hour"));
    await insertText("7");
    await expect.poll(() => document.activeElement).toBe(segment("Minute"));
    expect(segment("Hour").textContent).toBe("07");
  });
});
