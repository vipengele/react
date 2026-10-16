import { act, fireEvent, render, screen } from "@testing-library/react";
import { Locale, type LocalTime } from "@vipengele/ts";
import { describe, expect, it, vi } from "vitest";
import type { TimeFieldEdge } from "./timeFieldKeys.js";
import { displaySegments } from "./timeSegments.js";
import { useTimeField } from "./useTimeField.js";

const deDE = new Locale("de-DE");

interface HarnessProps {
  onChange: (value: LocalTime | undefined) => void;
  onExitPast: ((edge: TimeFieldEdge) => void) | undefined;
}

/** The bare segments of one `useTimeField`, with a button beside them for focus to leave onto. */
function Harness({ onChange, onExitPast }: HarnessProps) {
  const field = useTimeField({
    controlled: false,
    value: undefined,
    defaultValue: undefined,
    onChange,
    locale: deDE,
    seconds: false,
    disabled: false,
    onFocus: undefined,
    onBlur: undefined,
    onExitPast,
  });
  return (
    <>
      {/* biome-ignore lint/a11y/useSemanticElements: the harness mirrors TimeField's plain role="group" */}
      <div role="group" onFocus={field.onFocus} onBlur={field.onBlur}>
        {displaySegments(field.layout, field.fieldState).map((part) =>
          part.type === "literal" ? null : (
            <span
              key={part.type}
              role="spinbutton"
              aria-label={part.type}
              aria-valuenow={part.value}
              tabIndex={0}
              ref={field.segmentRef(part.type)}
              onKeyDown={field.segmentKeyDown(part.type)}
            >
              {part.text}
            </span>
          ),
        )}
      </div>
      <button type="button">Next</button>
    </>
  );
}

const segment = (name: "hour" | "minute") => screen.getByRole("spinbutton", { name });
const press = (key: string) => fireEvent.keyDown(document.activeElement as HTMLElement, { key });

describe("useTimeField's onExitPast", () => {
  it("reports an arrow pointing past either end, in logical order", () => {
    const onExitPast = vi.fn();
    render(<Harness onChange={vi.fn()} onExitPast={onExitPast} />);
    act(() => segment("hour").focus());
    press("ArrowLeft");
    expect(onExitPast).toHaveBeenLastCalledWith("start");
    press("ArrowRight");
    expect(onExitPast).toHaveBeenCalledOnce();
    press("ArrowRight");
    expect(onExitPast).toHaveBeenLastCalledWith("end");
    expect(document.activeElement).toBe(segment("minute"));
  });

  it("commits the filled last segment once, before focus moves on past it", () => {
    const onChange = vi.fn();
    let shownOnExit: string | null = null;
    const onExitPast = vi.fn(() => {
      shownOnExit = segment("minute").getAttribute("aria-valuenow");
      screen.getByRole("button", { name: "Next" }).focus();
    });
    render(<Harness onChange={onChange} onExitPast={onExitPast} />);
    act(() => segment("hour").focus());
    for (const key of "0930") {
      press(key);
    }
    expect(onExitPast).toHaveBeenCalledExactlyOnceWith("end");
    // The commit has rendered by the time the field hands entry on.
    expect(shownOnExit).toBe("30");
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Next" }));
    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange.mock.calls[0]?.[0]?.toString()).toBe("09:30");
  });

  it("leaves focus on a filled last segment with no onExitPast", () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} onExitPast={undefined} />);
    act(() => segment("hour").focus());
    for (const key of "0930") {
      press(key);
    }
    expect(document.activeElement).toBe(segment("minute"));
    expect(onChange).toHaveBeenCalledOnce();
  });
});
