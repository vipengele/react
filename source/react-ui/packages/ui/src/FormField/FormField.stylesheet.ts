/**
 * `<FormField>`'s own styles, injected as an inline `<style>` rather than a `.css` import so the
 * package can stay `"sideEffects": false` (same approach as `Card`'s and `Toggle`'s
 * stylesheets).
 *
 * Every `--tandiko-*` property is *read* here through `var()` and never assigned inline by the
 * component: an inline style declaration always wins over a stylesheet rule for the same
 * property on the same element, so an inline theme property would permanently shadow
 * `@tandiko/tokens`'s dark-mode reassignment and this field would stop adapting to colour mode.
 *
 * The label, help and error text take steps of the type scale, and the error its colour from the
 * danger family — the same mode-resolved red `Button`'s danger variant and an invalid field's
 * border read.
 *
 * The vertical rhythm is two spacing steps, not one, because the label-to-control relationship and
 * the control-to-hint relationship read differently: `--tandiko-space-2` gives the label room to
 * read as a heading for the control beneath it, while `--tandiko-space-1` keeps a hint or error
 * pinned tight under the control it describes. Both are tighter than the gap `FieldSet` puts
 * between sibling fields (`--tandiko-space-5`), so a column of fields reads as grouped units
 * rather than an undifferentiated stack. `gap` cannot express this — it is uniform across every
 * pair of flex children — so the rhythm is margins on the label and on the hint/error text instead.
 */
export const formFieldStylesheet = `
.tandiko-form-field {
  display: flex;
  flex-direction: column;
}

.tandiko-form-field-label {
  margin: 0 0 var(--tandiko-space-2);
  font-size: var(--tandiko-font-size-sm);
  font-weight: 500;
  color: var(--tandiko-ink);
}

.tandiko-form-field-hint {
  margin-top: var(--tandiko-space-1);
  font-size: var(--tandiko-font-size-xs);
  color: var(--tandiko-ink-muted);
}

.tandiko-form-field-error {
  margin-top: var(--tandiko-space-1);
  font-size: var(--tandiko-font-size-xs);
  color: var(--tandiko-danger);
}
`;
