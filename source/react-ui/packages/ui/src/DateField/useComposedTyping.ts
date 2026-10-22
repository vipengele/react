import { type ChangeEvent, type CompositionEvent, useRef } from "react";

/** The input handlers that hold a typing rule back until an IME composition ends. */
export interface ComposedTyping {
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onCompositionStart: () => void;
  onCompositionEnd: (event: CompositionEvent<HTMLInputElement>) => void;
}

/**
 * Runs the typing rule `apply(previous, typed)` on each change of an input holding `text`, and
 * hands its result to `setText`. While a composition is in progress the raw text goes to `setText`
 * untouched: an IME replaces the text it shows as it goes, so the rule runs once, at
 * `compositionend`, against the text as it stood at `compositionstart`. A composed Hangul syllable
 * then counts as one appended character, not a string of rewrites.
 */
export function useComposedTyping(
  text: string,
  setText: (text: string) => void,
  apply: (previous: string, typed: string) => string,
): ComposedTyping {
  // The text as it stood when the composition in progress began.
  const compositionStart = useRef<string | undefined>(undefined);

  return {
    onChange: (event) => {
      const typed = event.target.value;
      setText((event.nativeEvent as InputEvent).isComposing ? typed : apply(text, typed));
    },
    onCompositionStart: () => {
      compositionStart.current = text;
    },
    onCompositionEnd: (event) => {
      const previous = compositionStart.current ?? text;
      compositionStart.current = undefined;
      setText(apply(previous, event.currentTarget.value));
    },
  };
}
