/**
 * `<Autocomplete>`'s own styles — the wrapper, the chip row, the `role="combobox"` text input and
 * the empty-result message. The floating listbox, its options and the chips themselves are styled
 * by the shared `internal/listbox.stylesheet.ts`, which every combobox-shaped component in this
 * package injects.
 *
 * Injected as an inline `<style>` rather than a `.css` import so the package can stay
 * `"sideEffects": false` (same approach as `Card`'s and `Popover`'s stylesheets).
 *
 * Every `--tandiko-*` property is *read* here through `var()` and never assigned inline by the
 * component: an inline style declaration always wins over a stylesheet rule for the same property
 * on the same element, so an inline `--tandiko-surface` would permanently shadow the dark-mode
 * reassignment in `@tandiko/tokens`'s base stylesheet and the input would stop adapting to colour
 * mode.
 *
 * `@tandiko/tokens` defines neither the type scale nor a danger colour, so those reads carry
 * fallbacks (same convention as `Typography.stylesheet.ts` and `Dropdown.stylesheet.ts`).
 */
export const autocompleteStylesheet = `
.tandiko-autocomplete {
  display: inline-block;
  color: var(--tandiko-ink);
  font-family: var(--tandiko-font-sans);
}

/* Holds the chips and the input as siblings, and is drawn as the field itself so the chips read
   as being inside the control while the input keeps its own element — and its own DOM focus. */
.tandiko-autocomplete-control {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.25rem;
  box-sizing: border-box;
  min-width: var(--tandiko-autocomplete-min-width, 12rem);
  padding: 0.375rem 0.5rem;
  background-color: var(--tandiko-surface);
  border: 1px solid var(--tandiko-border-strong);
  border-radius: var(--tandiko-radius);
}

.tandiko-autocomplete-control:focus-within {
  border-color: var(--tandiko-accent);
  outline: 2px solid var(--tandiko-accent-ring);
  outline-offset: 2px;
}

.tandiko-autocomplete-control:has(.tandiko-autocomplete-input[aria-invalid="true"]) {
  border-color: var(--tandiko-danger, oklch(0.55 0.21 27));
}

.tandiko-autocomplete-input {
  flex: 1;
  min-width: 4rem;
  appearance: none;
  padding: 0.125rem 0.25rem;
  background: none;
  border: none;
  color: var(--tandiko-ink);
  font-family: inherit;
  font-size: var(--tandiko-typography-body-md-size, 1rem);
  line-height: 1.5;
}

/* The control draws the focus ring for the whole field, so a second one on the input inside it
   would double up. */
.tandiko-autocomplete-input:focus {
  outline: none;
}

.tandiko-autocomplete-input::placeholder {
  color: var(--tandiko-ink-subtle);
}

/* Not an option: it carries no role, is never highlighted and cannot be selected — it exists so
   a query matching nothing says so instead of closing the listbox. */
.tandiko-autocomplete-empty {
  padding: 0.375rem 0.5rem;
  color: var(--tandiko-ink-subtle);
}
`;
