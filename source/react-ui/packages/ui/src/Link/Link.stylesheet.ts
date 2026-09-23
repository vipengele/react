/**
 * `<Link>`'s own styles, injected as an inline `<style>` rather than a `.css` import so the
 * package can stay `"sideEffects": false`.
 *
 * Every `--vpg-*` property is *read* here through `var()` and never assigned inline by the
 * component: an inline custom property would shadow the dark-mode reassignment in
 * `@vipengele/react-tokens`'s base stylesheet and the link would stop adapting to colour mode.
 *
 * No `font-*` or `line-height` is set: a link inherits the typography of the text it sits in,
 * exactly as a plain `<a>` does.
 *
 * Each tone reads its own ramp — rest, `-visited`, `-hover`, `-ring` — rather than routing the
 * tone through a local custom property: a custom property assigned under `:visited` is one of the
 * declarations engines discard there for privacy, so the visited colour has to be a bare `color`
 * reading the token directly. The rules run link, visited, hover in that order, because they
 * share one specificity and a later rule wins: a hovered link shows the hover colour whether or
 * not it has been visited.
 */
export const linkStylesheet = `
.vpg-link {
  border-radius: var(--vpg-radius-sm);
  text-decoration-line: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 0.15em;
  cursor: pointer;
  transition: color var(--vpg-duration-fast) var(--vpg-ease-standard),
    text-decoration-thickness var(--vpg-duration-fast) var(--vpg-ease-standard);
}

.vpg-link:hover {
  text-decoration-thickness: 2px;
}

.vpg-link-accent {
  color: var(--vpg-accent);
}

.vpg-link-accent:visited {
  color: var(--vpg-accent-visited);
}

.vpg-link-accent:hover {
  color: var(--vpg-accent-hover);
}

.vpg-link-accent:focus-visible {
  /* Offset rather than inset so the ring stays legible against the surrounding text. */
  outline: var(--vpg-focus-ring-width) solid var(--vpg-accent-ring);
  outline-offset: var(--vpg-focus-ring-offset);
}

.vpg-link-danger {
  color: var(--vpg-danger);
}

.vpg-link-danger:visited {
  color: var(--vpg-danger-visited);
}

.vpg-link-danger:hover {
  color: var(--vpg-danger-hover);
}

.vpg-link-danger:focus-visible {
  outline: var(--vpg-focus-ring-width) solid var(--vpg-danger-ring);
  outline-offset: var(--vpg-focus-ring-offset);
}

/* Sized to the surrounding text and sat on its baseline, so the glyph scales with whatever
   typography the link inherits. */
.vpg-link-icon {
  display: inline-block;
  width: 0.85em;
  height: 0.85em;
  vertical-align: -0.1em;
}

/* Keeps "opens in a new tab" in the link's accessible name without taking up visual space. */
.vpg-link-visually-hidden {
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
