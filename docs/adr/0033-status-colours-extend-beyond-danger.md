# Status colours extend beyond danger to success, warning and info

A `Toast` has five tones — `neutral`, `success`, `warning`, `info` and `danger` — and four of them
name an outcome a reader should tell apart at a glance. The theme carries one status colour,
`--vpg-danger-*`. This ADR records how the other three get colours, what that costs a consumer
already overriding the theme, and which components read them. How a toast is raised and rendered
is settled in `0032-toast-is-the-one-imperative-component-api.md` and is not reopened here.

## Decisions

- **`success`, `warning` and `info` join `danger` as status colours, each seeded and derived
  exactly as `danger` is.** `ThemeSeed` takes a `success`, `warning` and `info` seed beside
  `danger`, each an `oklch()` colour. `createTheme` emits, for every status, the
  `--vpg-<status>-light` seed, the `-dark` variant derived from it, and the
  `-hover`/`-press`/`-wash`/`-ring`/`-contrast`/`-visited` ramp read off the base name through
  `var()`. The four families differ only in the colour they ramp off, so a component that reads one
  status reads any other by changing a name. The defaults are `oklch(0.52 0.14 150)` for success,
  `oklch(0.7 0.16 75)` for warning and `oklch(0.55 0.13 240)` for info.
- **The base names are stylesheet-owned.** `--vpg-success`, `--vpg-warning` and `--vpg-info` are
  assigned by the base stylesheet as `light-dark(var(--vpg-<status>-light),
  var(--vpg-<status>-dark))` and are absent from `createTheme`'s output, as `--vpg-danger` is
  (ADR-0007, ADR-0008). Each is in `STYLESHEET_OWNED_PROPERTIES`, so naming one in
  `ThemeOverrides` is a type error and, from untyped code, a `TypeError` from `createTheme`. A
  theme changes a status colour through its seed, which both modes derive from.
- **Only `Toast` reads the new colours.** `Badge` (`neutral | accent | danger`), `Button`,
  `Link` (`accent | danger`), `ConfirmDialog` (`default | danger`) and every other component that
  carries a tone or variant keep the values and the colours they have. A component that gains a
  success, warning or info tone does so in its own change, with its own stories.

## Considered options

- **Map the toast tones onto the accent and danger only** — `info` and `success` drawn in the
  accent, `warning` in danger. Rejected: the accent is the brand colour of every primary button,
  link and focus ring, so a success toast would read as an action rather than an outcome, and an
  info toast would be indistinguishable from it. A warning drawn in danger tells the reader
  something failed when nothing has.
- **A `tone` prop that carries no colour** — the tone sets an icon and an accessible label and the
  toast is drawn in neutral surface colours. Rejected: colour is the cue a reader takes in before
  reading the text, and a tone that changes nothing visible apart from a glyph leaves four of the
  five tones looking the same at the edge of the screen. A glyph is a cue that does not depend on
  colour vision, and it belongs alongside the colour rather than instead of it.
- **Seed the three colours but leave their base names overridable** — emit `--vpg-success`,
  `--vpg-warning` and `--vpg-info` from `createTheme`, so a consumer can set them in
  `ThemeOverrides` as before. Rejected: an inline base name cannot be reassigned by the
  `color-scheme` that drives `light-dark()`, so the dark ramp would never apply and the status
  colours would stay their light values on a dark ground — the failure ADR-0007 exists to rule out.
  It would also make `--vpg-danger` the one status colour that behaves differently from the other
  three, so the rule a contributor learns stops being statable in one sentence.

## Consequences

- **This is a breaking change for a consumer who sets the base names.** `ThemeOverrides` accepts
  any `--vpg-*` name outside the stylesheet-owned set, and a consumer may already set
  `--vpg-success`, `--vpg-warning` or `--vpg-info` there as names of their own. Doing so is a type
  error and a `createTheme` `TypeError`, which is why the tokens change ships as `feat(tokens)!`.
  The replacement is the seed of the same name. The release notes of the release that carries the
  change state the break and the replacement.
- **`--vpg-warning` does not stand alone on a light surface.** Amber reads as amber only well
  above the other seeds' lightness, so the default warning seed sits past the contrast token's
  `0.68` threshold: `--vpg-warning-contrast` resolves to black where the other three resolve to
  white, and `--vpg-warning` against the light surface is about 2.7:1 — under the 3:1 a border or
  icon needs and the 4.5:1 text needs. A component draws warning as a fill (`--vpg-warning` or
  `--vpg-warning-wash`) with its text and glyph in `--vpg-warning-contrast` or the ink, never as a
  bare border, text or icon colour on the surface. The other three have no such restriction at
  their defaults; a consumer's own seed is theirs to check.
- **`toast.promise` needs no amendment to ADR-0032.** Its `success` and `error` options are strings
  or functions of the settled value that return plain strings; the functions run when the promise
  settles and only their string results reach the store, so the store still holds plain data, and
  the call returns a toast id rather than the promise, so it still returns nothing the caller
  waits on beyond an id.
- `CONTEXT.md` defines **Status colour** as these four families and lists the hue names under
  _Avoid_, so a new component names a status by its outcome.
