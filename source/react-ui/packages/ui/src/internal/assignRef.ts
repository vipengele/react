import type { Ref } from "react";

/**
 * Hands `node` to a caller's ref, which is a function, an object, or absent. Forwarding it by hand
 * is what lets a component keep a ref of its own to the same element.
 *
 * A callback ref may return a cleanup function, which React runs in place of calling the ref with
 * `null`. That cleanup is returned so a component forwarding the ref can run it on detach;
 * `undefined` comes back for a ref that returned nothing, an object ref and an absent ref.
 */
export function assignRef<T>(ref: Ref<T> | undefined, node: T | null): (() => void) | undefined {
  if (typeof ref === "function") {
    const cleanup: unknown = ref(node);
    return typeof cleanup === "function" ? (cleanup as () => void) : undefined;
  }
  if (ref) {
    ref.current = node;
  }
  return undefined;
}
