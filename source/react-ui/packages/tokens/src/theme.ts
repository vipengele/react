/**
 * `'light' | 'dark'`, applied as `data-vpg-mode` on `ThemeProvider`'s root.
 * Omitted, the root inherits the host page's `[data-theme]` or `prefers-color-scheme`.
 */
export type ColorMode = "light" | "dark";

/**
 * The small set of user-supplied values `createTheme` expands into a full `Theme`.
 * Every field has a default, so `createTheme()` produces a complete theme.
 */
export interface ThemeSeed {
  /** Brand colour every interactive state ramps off. Must be an `oklch()` colour: the
   * ramps are `oklch(from ...)` relative colours, and a non-oklch seed makes the browser
   * convert it first, which loses the chroma headroom the wash and press steps assume. */
  accent?: string;
  /** Status colour every destructive and error state ramps off. Must be an `oklch()` colour,
   * for the same reason the accent must. */
  danger?: string;
  /** Foreground text colour. Also the source of every border and muted-text alpha. */
  ink?: string;
  /** Page background. Raised/sunken surfaces are lightness steps off it. */
  surface?: string;
  /** Base corner radius. `--vpg-radius-sm`/`-lg` are `calc()` multiples of it, at ×0.75
   * and ×1.5, so reseeding it moves the whole ladder together. */
  radius?: string;
  fontSans?: string;
  fontMono?: string;
}

/**
 * The frozen set of `--vpg-*` custom properties `ThemeProvider` applies inline to its
 * root element. Values are CSS strings, never JS-computed colours — the browser resolves
 * the ramps at paint time, so a mode flip is a pure-CSS cascade change. Deliberately
 * excludes every stylesheet-owned property: the colours `--vpg-accent`/`--vpg-ink`/
 * `--vpg-surface`/`--vpg-danger` (as opposed to their `-light`/`-dark` variants, which this DOES
 * include), the ramp scalars `--vpg-state-shift`/`--vpg-lift`/`--vpg-sink`, the
 * shadow inks `--vpg-shadow-contact`/`--vpg-shadow-ambient` and the motion durations
 * `--vpg-duration-fast`/`-normal`/`-slow`. The base stylesheet owns every one of them,
 * alongside the `color-scheme` that decides which arm of the colours' and inks' `light-dark()`
 * applies.
 */
export type Theme = Readonly<Record<`--vpg-${string}`, string>>;

/**
 * The properties whose declared value depends on an environment condition only the cascade
 * resolves — the colour mode, the reduced-motion preference. The base stylesheet assigns every
 * one of them on `.vpg-root`, and `createTheme` emits none of them (ADR-0007).
 */
export const STYLESHEET_OWNED_PROPERTIES = [
  "--vpg-accent",
  "--vpg-ink",
  "--vpg-surface",
  "--vpg-danger",
  "--vpg-shadow-contact",
  "--vpg-shadow-ambient",
  "--vpg-state-shift",
  "--vpg-lift",
  "--vpg-sink",
  "--vpg-duration-fast",
  "--vpg-duration-normal",
  "--vpg-duration-slow",
] as const;

/**
 * A `--vpg-*` property the base stylesheet owns because its value depends on an environment
 * condition the cascade resolves: the colour mode for the colours, inks and ramp scalars, the
 * reduced-motion preference for the durations. Neither `createTheme`'s output nor a
 * `ThemeOverrides` may carry one: both reach the element as an inline style, which no mode rule
 * and no media query can override.
 */
export type StylesheetOwnedProperty = (typeof STYLESHEET_OWNED_PROPERTIES)[number];

/**
 * A partial map of `--vpg-*` properties to CSS strings, composed over the seed-derived
 * result by `createTheme`.
 *
 * Any `--vpg-*` name is accepted, not just the ones `createTheme` emits, so a consumer can
 * carry their own properties on the same root and have them frozen into the same object.
 *
 * The stylesheet-owned properties are excluded: each is typed `never`, so naming one in an object
 * literal is a type error, and `createTheme` throws on one that reaches it through a wider type.
 */
export type ThemeOverrides = Readonly<
  Partial<Record<`--vpg-${string}`, string>> & {
    [K in StylesheetOwnedProperty]?: never;
  }
>;

const DEFAULT_SEED: Required<ThemeSeed> = {
  accent: "oklch(0.58 0.19 264)",
  danger: "oklch(0.55 0.21 27)",
  ink: "oklch(0.22 0.02 264)",
  surface: "oklch(0.99 0.003 264)",
  radius: "0.5rem",
  fontSans: '"Poppins", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
  fontMono: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
};

/**
 * Expands a seed into a `Theme`.
 *
 * Only `--vpg-*-light`/`-dark` and the radius/font entries carry literal seed values.
 * Every other entry is a CSS expression that reads back through `var()`.
 *
 * The stylesheet-owned properties are deliberately ABSENT from this object: the colours
 * `--vpg-accent`, `--vpg-ink`, `--vpg-surface` and `--vpg-danger`, the ramp scalars
 * `--vpg-state-shift`, `--vpg-lift` and `--vpg-sink`, the shadow inks
 * `--vpg-shadow-contact` and `--vpg-shadow-ambient`, and the motion durations
 * `--vpg-duration-fast`, `--vpg-duration-normal` and `--vpg-duration-slow`. The
 * base stylesheet assigns each of them on `.vpg-root` — the colours and inks as
 * `light-dark(<light>, <dark>)` next to the `color-scheme` that picks the arm, the scalars as
 * their light values, the durations as their full-motion values — and its mode and
 * reduced-motion rules reassign them. `ThemeProvider` applies every key here as an inline
 * style, and an inline style declaration always wins over a stylesheet rule for the same
 * property on the same element — including one inside a media query — so anything inline is
 * beyond the reach of a rule matching that same element. Only the `-light`/`-dark` variants
 * below and the expressions that read a stylesheet-owned property back through `var()` are safe
 * to apply inline (ADR-0007).
 *
 * The seed always describes the light appearance — `-light` variants carry it verbatim, and
 * `-dark` variants derive from it via `oklch(from ...)`. They're kept as separate properties
 * (rather than letting `--vpg-accent-dark` derive from `--vpg-accent`) to break a
 * cycle: `--vpg-accent` is a `light-dark()` over both variants, so a
 * `--vpg-accent-dark` reading `var(--vpg-accent)` back would be self-referential and
 * invalid at computed-value time.
 *
 * `overrides` compose over the derived result, replacing or adding individual `--vpg-*`
 * values without restating a seed. They are subject to the same invariant, and more sharply:
 * everything here lands inline on `.vpg-root`, so an override naming a stylesheet-owned
 * property would shadow the base stylesheet's declaration and pin that property to one colour
 * mode, or to full motion, for the life of the provider. Passing one throws. The route to a
 * different value is a stylesheet rule of the consumer's own, at ordinary specificity, which the
 * mode and reduced-motion rules can still beat where they should.
 */
export function createTheme(seed: ThemeSeed = {}, overrides: ThemeOverrides = {}): Theme {
  const { accent, danger, ink, surface, radius, fontSans, fontMono } = {
    ...DEFAULT_SEED,
    ...seed,
  };

  const shadowed = STYLESHEET_OWNED_PROPERTIES.filter((property) => property in overrides);
  if (shadowed.length > 0) {
    throw new TypeError(
      `createTheme cannot override the stylesheet-owned ${shadowed.length === 1 ? "property" : "properties"} ${shadowed.join(", ")}: ThemeProvider applies a Theme inline, where no colour-mode or reduced-motion rule can reach it. Assign them in a stylesheet rule of your own instead.`,
    );
  }

  const theme: Record<`--vpg-${string}`, string> = {
    // The light appearance, carrying the seed verbatim. Never overridden by a mode rule,
    // so the dark variants below always resolve against the colour the consumer passed.
    "--vpg-accent-light": accent,
    "--vpg-danger-light": danger,
    "--vpg-ink-light": ink,
    "--vpg-surface-light": surface,

    // The dark appearance, derived from the light variants.
    "--vpg-accent-dark": "oklch(from var(--vpg-accent-light) calc(l + 0.08) calc(c * 0.92) h)",
    "--vpg-danger-dark": "oklch(from var(--vpg-danger-light) calc(l + 0.08) calc(c * 0.92) h)",
    "--vpg-ink-dark": "oklch(from var(--vpg-ink-light) 0.94 calc(c * 0.6) h)",
    // `max(..., 0.015)` floors the chroma rather than letting it scale purely off the seed's
    // own: a near-neutral seed (the default's c is 0.003) would otherwise multiply down to a
    // chroma so small the surface reads as flat, colourless near-black instead of a dark tint
    // of the seed's hue. 0.40 reads as a dark charcoal rather than near-black, while staying
    // dark enough that `--vpg-ink-dark`'s 0.94 lightness keeps strong text contrast on it.
    "--vpg-surface-dark": "oklch(from var(--vpg-surface-light) 0.40 max(c * 3, 0.015) h)",

    // Accent ramp. `--vpg-state-shift` comes from the stylesheet, not from here: its
    // sign flips with the mode, so a hover lightens on a dark ground and darkens on a light
    // one, and the ramps below re-derive themselves when the dark rule reassigns it.
    "--vpg-accent-hover": "oklch(from var(--vpg-accent) calc(l + var(--vpg-state-shift)) c h)",
    "--vpg-accent-press": "oklch(from var(--vpg-accent) calc(l + var(--vpg-state-shift) * 2) c h)",
    "--vpg-accent-wash": "oklch(from var(--vpg-accent) calc(l - var(--vpg-state-shift) * 6.5) calc(c * 0.16) h)",
    "--vpg-accent-ring": "oklch(from var(--vpg-accent) l c h / 0.45)",
    // Black or white, whichever reads on the accent: `(0.68 - l) * 1000` saturates the
    // clamp to 0 or 1 either side of the lightness threshold.
    "--vpg-accent-contrast": "oklch(from var(--vpg-accent) clamp(0, (0.68 - l) * 1000, 1) 0 h)",
    // A visited link darkens rather than lightening, so it reads as a distinct step from
    // hover and press (both of which shift the opposite direction) at rest, with no
    // interaction needed to see it.
    "--vpg-accent-visited": "oklch(from var(--vpg-accent) calc(l - var(--vpg-state-shift) * 3) c h)",

    // Danger ramp, derived from `--vpg-danger` exactly as the accent ramp is derived from
    // `--vpg-accent`: a destructive control carries the same hover, press, ring, contrast
    // and visited relationships as a primary one, differing only in the colour it ramps off.
    "--vpg-danger-hover": "oklch(from var(--vpg-danger) calc(l + var(--vpg-state-shift)) c h)",
    "--vpg-danger-press": "oklch(from var(--vpg-danger) calc(l + var(--vpg-state-shift) * 2) c h)",
    "--vpg-danger-ring": "oklch(from var(--vpg-danger) l c h / 0.45)",
    "--vpg-danger-contrast": "oklch(from var(--vpg-danger) clamp(0, (0.68 - l) * 1000, 1) 0 h)",
    "--vpg-danger-visited": "oklch(from var(--vpg-danger) calc(l - var(--vpg-state-shift) * 3) c h)",

    // Ink ramp. Alpha rather than lightness, so these stay legible against any surface
    // and flip with the mode for free.
    "--vpg-ink-muted": "oklch(from var(--vpg-ink) l c h / 0.68)",
    "--vpg-ink-subtle": "oklch(from var(--vpg-ink) l c h / 0.45)",
    "--vpg-border": "oklch(from var(--vpg-ink) l c h / 0.16)",
    "--vpg-border-strong": "oklch(from var(--vpg-ink) l c h / 0.32)",

    // Surface ramp. `--vpg-lift` and `--vpg-sink` also come from the stylesheet: a
    // dark ground needs a wider lift to read as raised and a narrower sink before it reads
    // as a hole.
    "--vpg-surface-raised": "oklch(from var(--vpg-surface) calc(l + var(--vpg-lift)) c h)",
    "--vpg-surface-sunken": "oklch(from var(--vpg-surface) calc(l - var(--vpg-sink)) c h)",
    "--vpg-surface-hover": "oklch(from var(--vpg-surface) calc(l - var(--vpg-sink) * 0.5) c h)",
    "--vpg-surface-press": "oklch(from var(--vpg-surface) calc(l - var(--vpg-sink) * 1.5) c h)",

    "--vpg-radius": radius,
    // Both steps are `calc()` multiples of the seed, so a consumer who reseeds `radius` keeps a
    // coherent ladder. The multipliers land the default 0.5rem seed on 6px inner and 12px outer,
    // the range at which a 2rem control reads as rounded rather than as a pill or a rectangle.
    "--vpg-radius-sm": "calc(var(--vpg-radius) * 0.75)",
    "--vpg-radius-lg": "calc(var(--vpg-radius) * 1.5)",
    "--vpg-radius-full": "9999px",

    "--vpg-font-sans": fontSans,
    "--vpg-font-mono": fontMono,

    // Control size scale: the outer box height of anything a pointer targets — button, field,
    // option row, toggle. `md` is the default control height every other step is read against.
    "--vpg-size-xs": "1.5rem",
    "--vpg-size-sm": "1.75rem",
    "--vpg-size-md": "2rem",
    "--vpg-size-lg": "2.25rem",
    "--vpg-size-xl": "2.5rem",
    // Past the range a pointer aims at: a display step, for something sized like a large
    // avatar rather than targeted.
    "--vpg-size-2xl": "3rem",

    // Glyph box of an icon sitting inside a control. Sized independently of the control: an
    // icon scaled off the control height crowds a dense row long before the text does.
    "--vpg-icon-sm": "0.875rem",
    "--vpg-icon-md": "1rem",
    "--vpg-icon-lg": "1.25rem",
    "--vpg-icon-xl": "1.5rem",

    // Spacing scale, `n * 0.25rem`. Every gap, padding and inset steps through it, so two
    // components side by side align without either knowing the other's measurements.
    "--vpg-space-1": "0.25rem",
    "--vpg-space-2": "0.5rem",
    "--vpg-space-3": "0.75rem",
    "--vpg-space-4": "1rem",
    "--vpg-space-5": "1.25rem",
    "--vpg-space-6": "1.5rem",
    "--vpg-space-7": "1.75rem",
    "--vpg-space-8": "2rem",

    // Type scale. `sm` is the body and label size — the size a control's own text takes.
    "--vpg-font-size-xs": "0.75rem",
    "--vpg-font-size-sm": "0.875rem",
    "--vpg-font-size-md": "1rem",
    "--vpg-font-size-lg": "1.125rem",
    "--vpg-font-size-xl": "1.25rem",
    "--vpg-font-size-2xl": "1.5rem",
    "--vpg-font-size-3xl": "1.875rem",
    "--vpg-font-size-4xl": "2.25rem",
    "--vpg-font-size-5xl": "3rem",

    "--vpg-font-weight-regular": "400",
    "--vpg-font-weight-medium": "500",
    "--vpg-font-weight-semibold": "600",
    "--vpg-font-weight-bold": "700",

    // Unitless, so a line box scales with whatever font size the element resolves to.
    "--vpg-line-height-tight": "1.2",
    "--vpg-line-height-snug": "1.35",
    "--vpg-line-height-normal": "1.5",
    "--vpg-line-height-relaxed": "1.65",

    // In `em`, so tracking tightens with the type rather than staying a fixed distance that
    // over-tightens small text.
    "--vpg-letter-spacing-tight": "-0.02em",
    "--vpg-letter-spacing-normal": "0em",
    "--vpg-letter-spacing-wide": "0.02em",

    // Focus-ring geometry, shared by every component that draws a ring on `:focus-visible`, so
    // one ring is the same thickness at the same distance everywhere. The family carries no
    // colour: `--vpg-accent-ring` is already that colour, and a ring drawn inside its
    // element negates the offset rather than declaring its own.
    "--vpg-focus-ring-width": "2px",
    "--vpg-focus-ring-offset": "2px",

    // Motion. The durations come from the stylesheet, not from here: they collapse under
    // `prefers-reduced-motion: reduce`, and a media query cannot reach an inline declaration.
    // The easings stay — a curve shapes a transition's progress and is meaningless at a
    // collapsed duration, so none of them depends on the preference.
    "--vpg-ease-standard": "cubic-bezier(0.2, 0, 0, 1)",
    "--vpg-ease-entrance": "cubic-bezier(0, 0, 0.2, 1)",
    "--vpg-ease-exit": "cubic-bezier(0.4, 0, 1, 1)",

    // Elevation. Two layers each: a tight contact shadow that anchors the element to the
    // ground it sits on, and a wide ambient one that carries the height. A single blurred
    // layer reads as a blob at any offset large enough to be seen.
    //
    // The inks come from the stylesheet, not from here: a shadow that reads as depth on a
    // light ground is invisible at the same alpha on a dark one, so the two inks are
    // mode-resolved and these three compositions re-derive themselves when the mode flips.
    "--vpg-shadow-low": "0 1px 1px var(--vpg-shadow-contact), 0 1px 3px -1px var(--vpg-shadow-ambient)",
    "--vpg-shadow-med": "0 1px 2px var(--vpg-shadow-contact), 0 4px 10px -2px var(--vpg-shadow-ambient)",
    "--vpg-shadow-high": "0 2px 4px var(--vpg-shadow-contact), 0 12px 28px -6px var(--vpg-shadow-ambient)",

    // Stacking. Every floating surface portals into the same `.vpg-root`, so all of them
    // are siblings in one stacking context and a shared z-index leaves the order to whichever
    // mounted last. The order is containment: a listbox belongs to the control that opened it,
    // a popover is a surface over the page that can contain that control, a tooltip can be
    // triggered from inside either and must not be occluded by its own trigger. The 100-step
    // gaps are where a consumer's own content goes between two adjacent Vipengele surfaces.
    "--vpg-layer-listbox": "1000",
    "--vpg-layer-popover": "1100",
    "--vpg-layer-tooltip": "1200",
  };

  // Applied last, so a consumer's value replaces the derived one for the same property.
  Object.assign(theme, overrides);

  return Object.freeze(theme);
}
