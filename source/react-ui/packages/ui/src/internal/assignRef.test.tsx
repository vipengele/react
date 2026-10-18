import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { assignRef } from "./assignRef.js";

describe("assignRef", () => {
  it("calls a callback ref with the node", () => {
    const ref = vi.fn();
    const node = document.createElement("input");

    assignRef(ref, node);

    expect(ref).toHaveBeenCalledWith(node);
  });

  it("sets an object ref's current to the node", () => {
    const ref = createRef<HTMLInputElement>();
    const node = document.createElement("input");

    assignRef(ref, node);

    expect(ref.current).toBe(node);
  });

  it("clears an object ref when handed null", () => {
    const ref = createRef<HTMLInputElement>();
    assignRef(ref, document.createElement("input"));

    assignRef(ref, null);

    expect(ref.current).toBeNull();
  });

  it("does nothing for an absent ref", () => {
    expect(() => assignRef(undefined, document.createElement("input"))).not.toThrow();
    expect(() => assignRef(null, document.createElement("input"))).not.toThrow();
  });
});
