import type { Ref } from "react";

/**
 * Hands `node` to a caller's ref, which is a function, an object, or absent. Forwarding it by hand
 * is what lets a component keep a ref of its own to the same element.
 */
export function assignRef<T>(ref: Ref<T> | undefined, node: T | null): void {
  if (typeof ref === "function") {
    ref(node);
  } else if (ref) {
    ref.current = node;
  }
}
