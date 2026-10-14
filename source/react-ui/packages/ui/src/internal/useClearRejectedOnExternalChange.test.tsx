import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useClearRejectedOnExternalChange } from "./useClearRejectedOnExternalChange.js";

interface Props {
  isControlled: boolean;
  focused: boolean;
  iso: string | undefined;
  rejected: boolean;
}

function renderClearing(initial: Props) {
  const setRejected = vi.fn();
  const view = renderHook(
    (props: Props) => useClearRejectedOnExternalChange(props.isControlled, props.focused, props.iso, props.rejected, setRejected),
    {
      initialProps: initial,
    },
  );
  return { setRejected, rerender: view.rerender };
}

describe("useClearRejectedOnExternalChange", () => {
  it("clears the rejected flag when an unfocused controlled value changes", () => {
    const { setRejected, rerender } = renderClearing({ isControlled: true, focused: false, iso: "2026-10-01", rejected: true });
    rerender({ isControlled: true, focused: false, iso: "2026-10-02", rejected: true });
    expect(setRejected).toHaveBeenCalledExactlyOnceWith(false);
  });

  it("leaves a flag that is not set alone when the value changes", () => {
    const { setRejected, rerender } = renderClearing({ isControlled: true, focused: false, iso: "2026-10-01", rejected: false });
    rerender({ isControlled: true, focused: false, iso: "2026-10-02", rejected: false });
    expect(setRejected).not.toHaveBeenCalled();
  });

  it("does nothing when the same date is rebuilt as the same ISO string", () => {
    const { setRejected, rerender } = renderClearing({ isControlled: true, focused: false, iso: "2026-10-01", rejected: true });
    rerender({ isControlled: true, focused: false, iso: "2026-10-01", rejected: true });
    expect(setRejected).not.toHaveBeenCalled();
  });

  it("does nothing for an uncontrolled field", () => {
    const { setRejected, rerender } = renderClearing({ isControlled: false, focused: false, iso: "2026-10-01", rejected: true });
    rerender({ isControlled: false, focused: false, iso: "2026-10-02", rejected: true });
    expect(setRejected).not.toHaveBeenCalled();
  });

  it("holds off while focused and catches the change once focus leaves", () => {
    const { setRejected, rerender } = renderClearing({ isControlled: true, focused: true, iso: "2026-10-01", rejected: true });
    rerender({ isControlled: true, focused: true, iso: "2026-10-02", rejected: true });
    expect(setRejected).not.toHaveBeenCalled();
    rerender({ isControlled: true, focused: false, iso: "2026-10-02", rejected: true });
    expect(setRejected).toHaveBeenCalledExactlyOnceWith(false);
  });

  it("treats a value emptied from outside as a change", () => {
    const { setRejected, rerender } = renderClearing({ isControlled: true, focused: false, iso: "2026-10-01", rejected: true });
    rerender({ isControlled: true, focused: false, iso: undefined, rejected: true });
    expect(setRejected).toHaveBeenCalledExactlyOnceWith(false);
  });
});
