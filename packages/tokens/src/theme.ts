/**
 * `'light' | 'dark'`, applied as `data-tandiko-mode` on `ThemeProvider`'s root.
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
  /** Foreground text colour. Also the source of every border and muted-text alpha. */
  ink?: string;
  /** Page background. Raised/sunken surfaces are lightness steps off it. */
  surface?: string;
  /** Base corner radius. `--tandiko-radius-sm`/`-lg` are `calc()` multiples of it. */
  radius?: string;
  fontSans?: string;
  fontMono?: string;
}

/**
 * The frozen set of `--tandiko-*` custom properties `ThemeProvider` applies inline to its
 * root element. Values are CSS strings, never JS-computed colours — the browser resolves
 * the ramps at paint time, so a mode flip is a pure-CSS cascade change. Deliberately
 * excludes every mode-resolved property: the colours `--tandiko-accent`/`--tandiko-ink`/
 * `--tandiko-surface` (as opposed to their `-light`/`-dark` variants, which this DOES
 * include), the ramp scalars `--tandiko-state-shift`/`--tandiko-lift`/`--tandiko-sink` and the
 * shadow inks `--tandiko-shadow-contact`/`--tandiko-shadow-ambient`. The base stylesheet owns
 * every one of them, alongside the `color-scheme` that decides which arm of the colours' and
 * inks' `light-dark()` applies.
 */
export type Theme = Readonly<Record<`--tandiko-${string}`, string>>;

/**
 * The properties whose declared value differs between the colour modes. The base stylesheet
 * assigns every one of them on `.tandiko-root`, and `createTheme` emits none of them (ADR-0007).
 */
const MODE_RESOLVED_PROPERTIES = [
  "--tandiko-accent",
  "--tandiko-ink",
  "--tandiko-surface",
  "--tandiko-shadow-contact",
  "--tandiko-shadow-ambient",
  "--tandiko-state-shift",
  "--tandiko-lift",
  "--tandiko-sink",
] as const;

/**
 * A `--tandiko-*` property the base stylesheet owns because its value depends on colour mode.
 * Neither `createTheme`'s output nor a `ThemeOverrides` may carry one: both reach the element
 * as an inline style, which no mode rule can override.
 */
export type ModeResolvedProperty = (typeof MODE_RESOLVED_PROPERTIES)[number];

/**
 * A partial map of `--tandiko-*` properties to CSS strings, composed over the seed-derived
 * result by `createTheme`.
 *
 * Any `--tandiko-*` name is accepted, not just the ones `createTheme` emits, so a consumer can
 * carry their own properties on the same root and have them frozen into the same object.
 *
 * The mode-resolved properties are excluded: each is typed `never`, so naming one in an object
 * literal is a type error, and `createTheme` throws on one that reaches it through a wider type.
 */
export type ThemeOverrides = Readonly<
  Partial<Record<`--tandiko-${string}`, string>> & {
    [K in ModeResolvedProperty]?: never;
  }
>;

const DEFAULT_SEED: Required<ThemeSeed> = {
  accent: "oklch(0.58 0.19 264)",
  ink: "oklch(0.22 0.02 264)",
  surface: "oklch(0.99 0.003 264)",
  radius: "0.5rem",
  fontSans:
    '"Poppins", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
  fontMono:
    'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
};

/**
 * Expands a seed into a `Theme`.
 *
 * Only `--tandiko-*-light`/`-dark` and the radius/font entries carry literal seed values.
 * Every other entry is a CSS expression that reads back through `var()`.
 *
 * The mode-resolved properties are deliberately ABSENT from this object: the colours
 * `--tandiko-accent`, `--tandiko-ink` and `--tandiko-surface`, the ramp scalars
 * `--tandiko-state-shift`, `--tandiko-lift` and `--tandiko-sink`, and the shadow inks
 * `--tandiko-shadow-contact` and `--tandiko-shadow-ambient`. The base stylesheet assigns each
 * of them on `.tandiko-root` — the colours and inks as `light-dark(<light>, <dark>)` next to
 * the `color-scheme` that picks the arm, the scalars as their light values — and the dark
 * rules reassign `color-scheme` and the three scalars. `ThemeProvider` applies every key here
 * as an inline style, and an inline style declaration always wins over a stylesheet rule for
 * the same property on the same element, so anything inline is beyond the reach of a mode
 * rule matching that same element. Only the `-light`/`-dark` variants below and the ramps that
 * read the mode-resolved properties back through `var()` are safe to apply inline (ADR-0007).
 *
 * The seed always describes the light appearance — `-light` variants carry it verbatim, and
 * `-dark` variants derive from it via `oklch(from ...)`. They're kept as separate properties
 * (rather than letting `--tandiko-accent-dark` derive from `--tandiko-accent`) to break a
 * cycle: `--tandiko-accent` is a `light-dark()` over both variants, so a
 * `--tandiko-accent-dark` reading `var(--tandiko-accent)` back would be self-referential and
 * invalid at computed-value time.
 *
 * `overrides` compose over the derived result, replacing or adding individual `--tandiko-*`
 * values without restating a seed. They are subject to the same invariant, and more sharply:
 * everything here lands inline on `.tandiko-root`, so an override naming a mode-resolved
 * property would shadow the base stylesheet's declaration and pin that property to one mode for
 * the life of the provider. Passing one throws. The route to a different mode-resolved value is
 * a stylesheet rule of the consumer's own, at ordinary specificity, which the mode rules can
 * still beat where they should.
 */
export function createTheme(
  seed: ThemeSeed = {},
  overrides: ThemeOverrides = {},
): Theme {
  const { accent, ink, surface, radius, fontSans, fontMono } = {
    ...DEFAULT_SEED,
    ...seed,
  };

  const shadowed = MODE_RESOLVED_PROPERTIES.filter(
    (property) => property in overrides,
  );
  if (shadowed.length > 0) {
    throw new TypeError(
      `createTheme cannot override the mode-resolved ${shadowed.length === 1 ? "property" : "properties"} ${shadowed.join(", ")}: ThemeProvider applies a Theme inline, where no colour-mode rule can reach it. Assign them in a stylesheet rule of your own instead.`,
    );
  }

  const theme: Record<`--tandiko-${string}`, string> = {
    // The light appearance, carrying the seed verbatim. Never overridden by a mode rule,
    // so the dark variants below always resolve against the colour the consumer passed.
    "--tandiko-accent-light": accent,
    "--tandiko-ink-light": ink,
    "--tandiko-surface-light": surface,

    // The dark appearance, derived from the light variants.
    "--tandiko-accent-dark":
      "oklch(from var(--tandiko-accent-light) calc(l + 0.08) calc(c * 0.92) h)",
    "--tandiko-ink-dark":
      "oklch(from var(--tandiko-ink-light) 0.94 calc(c * 0.6) h)",
    // `max(..., 0.015)` floors the chroma rather than letting it scale purely off the seed's
    // own: a near-neutral seed (the default's c is 0.003) would otherwise multiply down to a
    // chroma so small the surface reads as flat, colourless near-black instead of a dark tint
    // of the seed's hue. 0.40 reads as a dark charcoal rather than near-black, while staying
    // dark enough that `--tandiko-ink-dark`'s 0.94 lightness keeps strong text contrast on it.
    "--tandiko-surface-dark":
      "oklch(from var(--tandiko-surface-light) 0.40 max(c * 3, 0.015) h)",

    // Accent ramp. `--tandiko-state-shift` comes from the stylesheet, not from here: its
    // sign flips with the mode, so a hover lightens on a dark ground and darkens on a light
    // one, and the ramps below re-derive themselves when the dark rule reassigns it.
    "--tandiko-accent-hover":
      "oklch(from var(--tandiko-accent) calc(l + var(--tandiko-state-shift)) c h)",
    "--tandiko-accent-press":
      "oklch(from var(--tandiko-accent) calc(l + var(--tandiko-state-shift) * 2) c h)",
    "--tandiko-accent-wash":
      "oklch(from var(--tandiko-accent) calc(l - var(--tandiko-state-shift) * 6.5) calc(c * 0.16) h)",
    "--tandiko-accent-ring": "oklch(from var(--tandiko-accent) l c h / 0.45)",
    // Black or white, whichever reads on the accent: `(0.68 - l) * 1000` saturates the
    // clamp to 0 or 1 either side of the lightness threshold.
    "--tandiko-accent-contrast":
      "oklch(from var(--tandiko-accent) clamp(0, (0.68 - l) * 1000, 1) 0 h)",

    // Ink ramp. Alpha rather than lightness, so these stay legible against any surface
    // and flip with the mode for free.
    "--tandiko-ink-muted": "oklch(from var(--tandiko-ink) l c h / 0.68)",
    "--tandiko-ink-subtle": "oklch(from var(--tandiko-ink) l c h / 0.45)",
    "--tandiko-border": "oklch(from var(--tandiko-ink) l c h / 0.16)",
    "--tandiko-border-strong": "oklch(from var(--tandiko-ink) l c h / 0.32)",

    // Surface ramp. `--tandiko-lift` and `--tandiko-sink` also come from the stylesheet: a
    // dark ground needs a wider lift to read as raised and a narrower sink before it reads
    // as a hole.
    "--tandiko-surface-raised":
      "oklch(from var(--tandiko-surface) calc(l + var(--tandiko-lift)) c h)",
    "--tandiko-surface-sunken":
      "oklch(from var(--tandiko-surface) calc(l - var(--tandiko-sink)) c h)",
    "--tandiko-surface-hover":
      "oklch(from var(--tandiko-surface) calc(l - var(--tandiko-sink) * 0.5) c h)",
    "--tandiko-surface-press":
      "oklch(from var(--tandiko-surface) calc(l - var(--tandiko-sink) * 1.5) c h)",

    "--tandiko-radius": radius,
    "--tandiko-radius-sm": "calc(var(--tandiko-radius) * 0.5)",
    "--tandiko-radius-lg": "calc(var(--tandiko-radius) * 2)",
    "--tandiko-radius-full": "9999px",

    "--tandiko-font-sans": fontSans,
    "--tandiko-font-mono": fontMono,

    // Control size scale: the outer box height of anything a pointer targets — button, field,
    // option row, toggle. `md` is the default control height every other step is read against.
    "--tandiko-size-xs": "1.5rem",
    "--tandiko-size-sm": "1.75rem",
    "--tandiko-size-md": "2rem",
    "--tandiko-size-lg": "2.25rem",
    "--tandiko-size-xl": "2.5rem",

    // Glyph box of an icon sitting inside a control. Sized independently of the control: an
    // icon scaled off the control height crowds a dense row long before the text does.
    "--tandiko-icon-sm": "0.875rem",
    "--tandiko-icon-md": "1rem",
    "--tandiko-icon-lg": "1.25rem",

    // Spacing scale, `n * 0.25rem`. Every gap, padding and inset steps through it, so two
    // components side by side align without either knowing the other's measurements.
    "--tandiko-space-1": "0.25rem",
    "--tandiko-space-2": "0.5rem",
    "--tandiko-space-3": "0.75rem",
    "--tandiko-space-4": "1rem",
    "--tandiko-space-5": "1.25rem",
    "--tandiko-space-6": "1.5rem",
    "--tandiko-space-7": "1.75rem",
    "--tandiko-space-8": "2rem",

    // Type scale. `sm` is the body and label size — the size a control's own text takes.
    "--tandiko-font-size-xs": "0.75rem",
    "--tandiko-font-size-sm": "0.875rem",
    "--tandiko-font-size-md": "1rem",
    "--tandiko-font-size-lg": "1.125rem",
    "--tandiko-font-size-xl": "1.25rem",
    "--tandiko-font-size-2xl": "1.5rem",
    "--tandiko-font-size-3xl": "1.875rem",
    "--tandiko-font-size-4xl": "2.25rem",

    "--tandiko-font-weight-regular": "400",
    "--tandiko-font-weight-medium": "500",
    "--tandiko-font-weight-semibold": "600",
    "--tandiko-font-weight-bold": "700",

    // Unitless, so a line box scales with whatever font size the element resolves to.
    "--tandiko-line-height-tight": "1.2",
    "--tandiko-line-height-snug": "1.35",
    "--tandiko-line-height-normal": "1.5",
    "--tandiko-line-height-relaxed": "1.65",

    // In `em`, so tracking tightens with the type rather than staying a fixed distance that
    // over-tightens small text.
    "--tandiko-letter-spacing-tight": "-0.02em",
    "--tandiko-letter-spacing-normal": "0em",
    "--tandiko-letter-spacing-wide": "0.02em",

    // Motion. `fast` covers a state change on a control the pointer is already over, `normal`
    // an element entering or leaving the layout, `slow` a surface crossing the viewport.
    "--tandiko-duration-fast": "120ms",
    "--tandiko-duration-normal": "200ms",
    "--tandiko-duration-slow": "320ms",

    "--tandiko-ease-standard": "cubic-bezier(0.2, 0, 0, 1)",
    "--tandiko-ease-entrance": "cubic-bezier(0, 0, 0.2, 1)",
    "--tandiko-ease-exit": "cubic-bezier(0.4, 0, 1, 1)",

    // Elevation. Two layers each: a tight contact shadow that anchors the element to the
    // ground it sits on, and a wide ambient one that carries the height. A single blurred
    // layer reads as a blob at any offset large enough to be seen.
    //
    // The inks come from the stylesheet, not from here: a shadow that reads as depth on a
    // light ground is invisible at the same alpha on a dark one, so the two inks are
    // mode-resolved and these three compositions re-derive themselves when the mode flips.
    "--tandiko-shadow-low":
      "0 1px 1px var(--tandiko-shadow-contact), 0 1px 3px -1px var(--tandiko-shadow-ambient)",
    "--tandiko-shadow-med":
      "0 1px 2px var(--tandiko-shadow-contact), 0 4px 10px -2px var(--tandiko-shadow-ambient)",
    "--tandiko-shadow-high":
      "0 2px 4px var(--tandiko-shadow-contact), 0 12px 28px -6px var(--tandiko-shadow-ambient)",
  };

  // Applied last, so a consumer's value replaces the derived one for the same property.
  Object.assign(theme, overrides);

  return Object.freeze(theme);
}
