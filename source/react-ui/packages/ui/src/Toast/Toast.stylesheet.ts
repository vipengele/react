/**
 * `<ToastRegion>`'s own styles, injected as an inline `<style>` rather than a `.css` import so the
 * package can stay `"sideEffects": false`.
 *
 * Every `--vpg-*` property is *read* here through `var()` and never assigned inline by the
 * component: an inline declaration always wins over a stylesheet rule for the same property on the
 * same element, so an inline status colour would shadow the colour-mode reassignment in
 * `@vipengele/react-tokens`'s base stylesheet and the toast would stop adapting to colour mode.
 *
 * The region is a `popover="manual"` element, so it sits in the top layer and takes no
 * `--vpg-layer-*` step. The user-agent popover rules centre it in the viewport with a border, a
 * padding and a canvas background; the region rule resets all of them and pins it to the corner or
 * edge its `data-placement` names, inset from the viewport by one spacing step. It never sets
 * `display`: an author `display` beats the user-agent `display: none` that hides a popover not
 * showing. With no toast the region has no height, so it covers nothing on the page.
 *
 * The status tones draw the toast on their `-wash` with the text in the ink, and the glyph on a
 * chip filled with the status colour in its `-contrast` ink. A status colour never stands alone as
 * a border, text or glyph colour on the surface: `--vpg-warning` falls under the contrast a border
 * or a glyph needs against a light surface (ADR-0033).
 *
 * Only the entry animates: a toast fades in and slides from the edge its region sits on. A
 * dismissed toast leaves the DOM, so there is no frame left to animate an exit in. The duration
 * comes from the theme, whose reduced-motion rule collapses it.
 *
 * `.vpg-toast-announcer` is the region's live region. It sits outside the popover and is visually
 * hidden, so it is read and never seen.
 */
export const toastStylesheet = `
.vpg-toast-region {
  box-sizing: border-box;
  position: fixed;
  inset: auto;
  width: min(var(--vpg-column-xl), 100% - var(--vpg-space-4) * 2);
  height: auto;
  margin: 0;
  padding: 0;
  overflow: visible;
  background: transparent;
  border: 0;
  color: var(--vpg-ink);
  font-family: var(--vpg-font-sans);
  font-size: var(--vpg-font-size-md);
  line-height: var(--vpg-line-height-normal);
}

.vpg-toast-region:where([data-placement^="top-"]) {
  top: var(--vpg-space-4);
}

.vpg-toast-region:where([data-placement^="bottom-"]) {
  bottom: var(--vpg-space-4);
}

.vpg-toast-region:where([data-placement$="-start"]) {
  inset-inline-start: var(--vpg-space-4);
}

.vpg-toast-region:where([data-placement$="-end"]) {
  inset-inline-end: var(--vpg-space-4);
}

.vpg-toast-region:where([data-placement$="-center"]) {
  inset-inline: 0;
  margin-inline: auto;
}

.vpg-toast-list {
  display: flex;
  flex-direction: column;
  gap: var(--vpg-space-2);
  margin: 0;
  padding: 0;
  list-style: none;
}

.vpg-toast {
  box-sizing: border-box;
  display: flex;
  align-items: flex-start;
  gap: var(--vpg-space-3);
  padding: var(--vpg-space-3) var(--vpg-space-4);
  overflow-wrap: break-word;
  background-color: var(--vpg-surface-raised);
  border: 1px solid var(--vpg-border);
  border-radius: var(--vpg-radius-lg);
  box-shadow: var(--vpg-shadow-med);
  opacity: 1;
  transform: none;
  transition:
    opacity var(--vpg-duration-normal) var(--vpg-ease-entrance),
    transform var(--vpg-duration-normal) var(--vpg-ease-entrance);
}

@starting-style {
  .vpg-toast {
    opacity: 0;
  }

  .vpg-toast-region:where([data-placement^="top-"]) .vpg-toast {
    transform: translateY(calc(var(--vpg-space-4) * -1));
  }

  .vpg-toast-region:where([data-placement^="bottom-"]) .vpg-toast {
    transform: translateY(var(--vpg-space-4));
  }
}

.vpg-toast-success {
  background-color: var(--vpg-success-wash);
}

.vpg-toast-warning {
  background-color: var(--vpg-warning-wash);
}

.vpg-toast-info {
  background-color: var(--vpg-info-wash);
}

.vpg-toast-danger {
  background-color: var(--vpg-danger-wash);
}

.vpg-toast-icon {
  box-sizing: content-box;
  flex: none;
  width: var(--vpg-icon-sm);
  height: var(--vpg-icon-sm);
  padding: var(--vpg-space-1);
  border-radius: var(--vpg-radius-full);
}

.vpg-toast-success > .vpg-toast-icon {
  background-color: var(--vpg-success);
  color: var(--vpg-success-contrast);
}

.vpg-toast-warning > .vpg-toast-icon {
  background-color: var(--vpg-warning);
  color: var(--vpg-warning-contrast);
}

.vpg-toast-info > .vpg-toast-icon {
  background-color: var(--vpg-info);
  color: var(--vpg-info-contrast);
}

.vpg-toast-danger > .vpg-toast-icon {
  background-color: var(--vpg-danger);
  color: var(--vpg-danger-contrast);
}

.vpg-toast-content {
  flex: 1 1 auto;
  min-width: 0;
  align-self: center;
}

.vpg-toast-message {
  margin: 0;
  font-weight: var(--vpg-font-weight-medium);
}

.vpg-toast-description {
  margin: var(--vpg-space-1) 0 0;
  color: var(--vpg-ink-muted);
  font-size: var(--vpg-font-size-sm);
}

.vpg-toast-action {
  flex: none;
  align-self: center;
  appearance: none;
  margin: 0;
  padding: var(--vpg-space-1) var(--vpg-space-3);
  background-color: transparent;
  border: 1px solid var(--vpg-border-strong);
  border-radius: var(--vpg-radius);
  color: inherit;
  font: inherit;
  font-size: var(--vpg-font-size-sm);
  font-weight: var(--vpg-font-weight-medium);
  cursor: pointer;
}

.vpg-toast-dismiss {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  box-sizing: content-box;
  width: var(--vpg-icon-md);
  height: var(--vpg-icon-md);
  appearance: none;
  margin: 0;
  padding: var(--vpg-space-1);
  background-color: transparent;
  border: 0;
  border-radius: var(--vpg-radius-sm);
  color: var(--vpg-ink-muted);
  cursor: pointer;
}

.vpg-toast-action:hover,
.vpg-toast-dismiss:hover {
  background-color: oklch(from var(--vpg-ink) l c h / 0.08);
  color: var(--vpg-ink);
}

.vpg-toast-action:focus-visible,
.vpg-toast-dismiss:focus-visible {
  outline: var(--vpg-focus-ring-width) solid var(--vpg-accent-ring);
  outline-offset: var(--vpg-focus-ring-offset);
}

.vpg-toast-dismiss-icon {
  width: 100%;
  height: 100%;
}

.vpg-toast-announcer {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
`;
