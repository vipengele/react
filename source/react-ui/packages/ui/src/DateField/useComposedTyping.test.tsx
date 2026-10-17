import { act, renderHook } from "@testing-library/react";
import type { ChangeEvent, CompositionEvent } from "react";
import { describe, expect, it, vi } from "vitest";
import { useComposedTyping } from "./useComposedTyping.js";

const apply = (previous: string, typed: string) => `${previous}|${typed}`;

function changeEvent(value: string, isComposing: boolean) {
  return { target: { value }, nativeEvent: { isComposing } } as unknown as ChangeEvent<HTMLInputElement>;
}

function compositionEndEvent(value: string) {
  return { currentTarget: { value } } as unknown as CompositionEvent<HTMLInputElement>;
}

function renderTyping(text: string) {
  const setText = vi.fn();
  const view = renderHook((current: string) => useComposedTyping(current, setText, apply), { initialProps: text });
  return { setText, view };
}

describe("useComposedTyping", () => {
  it("applies the rule to a change made outside a composition", () => {
    const { setText, view } = renderTyping("1");
    act(() => view.result.current.onChange(changeEvent("12", false)));
    expect(setText).toHaveBeenCalledExactlyOnceWith("1|12");
  });

  it("keeps the raw text of a change made during a composition", () => {
    const { setText, view } = renderTyping("1");
    act(() => view.result.current.onChange(changeEvent("12", true)));
    expect(setText).toHaveBeenCalledExactlyOnceWith("12");
  });

  it("applies the rule at compositionend against the text the composition began on", () => {
    const { setText, view } = renderTyping("1");
    act(() => view.result.current.onCompositionStart());
    view.rerender("12");
    act(() => view.result.current.onCompositionEnd(compositionEndEvent("123")));
    expect(setText).toHaveBeenCalledExactlyOnceWith("1|123");
  });

  it("applies the rule against the current text at a compositionend with no compositionstart before it", () => {
    const { setText, view } = renderTyping("1");
    act(() => view.result.current.onCompositionEnd(compositionEndEvent("12")));
    expect(setText).toHaveBeenCalledExactlyOnceWith("1|12");
  });
});
