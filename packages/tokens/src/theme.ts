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
 * excludes the mode-resolved `--tandiko-accent`/`--tandiko-ink`/`--tandiko-surface` (as
 * opposed to their `-light`/`-dark` variants, which this DOES include): the base
 * stylesheet owns those three, because an inline value would permanently shadow the
 * dark-mode override.
 */
export type Theme = Readonly<Record<`--tandiko-${string}`, string>>;

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
 * `--tandiko-accent`, `--tandiko-ink` and `--tandiko-surface` are deliberately ABSENT from
 * this object: `ThemeProvider` applies every key here as an inline style, and an inline
 * style declaration always wins over a stylesheet rule for the same property on the same
 * element — no selector, however specific, can override it. The base stylesheet is what
 * assigns those three properties (from the `-light` variants, by default) and what the
 * `[data-tandiko-mode="dark"]` rule reassigns (from the `-dark` variants), so the whole mode
 * switch depends on them never being set inline. Only the `-light`/`-dark` variants below
 * and the ramps that read the three mode-resolved properties back through `var()` are safe
 * to apply inline.
 *
 * The seed always describes the light appearance — `-light` variants carry it verbatim, and
 * `-dark` variants derive from it via `oklch(from ...)`. They're kept as separate properties
 * (rather than letting dark mode derive `--tandiko-accent-dark` from `--tandiko-accent`
 * directly) to break a cycle: dark mode assigns `--tandiko-accent: var(--tandiko-accent-dark)`,
 * so a `--tandiko-accent-dark` that read `var(--tandiko-accent)` back would be
 * self-referential and invalid at computed-value time.
 */
export function createTheme(seed: ThemeSeed = {}): Theme {
  const { accent, ink, surface, radius, fontSans, fontMono } = {
    ...DEFAULT_SEED,
    ...seed,
  };

  return Object.freeze({
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
    "--tandiko-surface-dark":
      "oklch(from var(--tandiko-surface-light) 0.17 calc(c * 2.5) h)",

    // Direction-and-size scalars for the dependent-state ramps. Dark mode flips the sign
    // of the state shift (a hover lightens on a dark ground, darkens on a light one) and
    // widens the elevation lift, which is the whole reason the ramps are expressions.
    "--tandiko-state-shift": "-0.05",
    "--tandiko-lift": "0.02",
    "--tandiko-sink": "0.04",

    // Accent ramp.
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

    // Surface ramp.
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
  });
}
