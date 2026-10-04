import { useEffect, useRef } from "react";

/** How long a pause in typing ends a type-ahead search and starts the next one afresh. */
const TYPE_AHEAD_RESET_MS = 500;

/**
 * The type-ahead buffer: the returned function adds a typed character and returns everything
 * typed since the last pause, lower-cased. The pending reset is cleared on unmount.
 */
export function useTypeAhead(): (char: string) => string {
  const stateRef = useRef({ buffer: "", timer: undefined as ReturnType<typeof setTimeout> | undefined });

  useEffect(() => () => clearTimeout(stateRef.current.timer), []);

  return (char) => {
    const state = stateRef.current;
    clearTimeout(state.timer);
    state.buffer += char.toLowerCase();
    state.timer = setTimeout(() => {
      state.buffer = "";
    }, TYPE_AHEAD_RESET_MS);
    return state.buffer;
  };
}
