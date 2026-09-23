# Never route a `:visited` colour through a component-local custom property

Browsers restrict what a `:visited` rule may change, for history-sniffing privacy: `color` and a
handful of other properties are allowed, but a custom property assignment inside a `:visited`
rule is discarded. A stylesheet that tries to set `--vpg-link-color` under `:visited` and read it
back in a shared `color: var(--vpg-link-color)` rule silently keeps the unvisited colour forever —
nothing errors, and the link simply never shows its visited state.

## Applies to

- Any component stylesheet with a `:visited` rule — currently `Link` (`vpg-link-accent:visited`,
  `vpg-link-danger:visited` in `src/Link/Link.stylesheet.ts`), and any future component that
  renders an anchor with tone-dependent visited styling.

## Example

```css
/* Correct — :visited sets color directly, per tone class */
.vpg-link-accent:visited { color: var(--vpg-accent-visited); }
.vpg-link-danger:visited { color: var(--vpg-danger-visited); }

/* Wrong — the custom property assignment is discarded under :visited, so this never applies */
.vpg-link:visited { --vpg-link-tone-color: var(--vpg-accent-visited); }
.vpg-link { color: var(--vpg-link-tone-color); }
```
