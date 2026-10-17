# Consumers alias their semantic names onto `--vpg-*`; the library ships no mapping seam

A repo that already has its own semantic custom properties (`--hatua-surface-card`,
`--hatua-text-muted`, `--hatua-border-subtle`) and a rule that no component reads a seed or a
literal reaches this library with a vocabulary of its own. This ADR settles how that vocabulary
meets `--vpg-*`: the consumer keeps its names as an **alias layer** declared in its own
stylesheet, each name resolving to a `--vpg-*` role token, and the library offers no seam for the
mapping. Adopting `--vpg-*` directly and deleting the alias layer is where a consumer ends up; the
layer is what lets it replace its primitives one at a time rather than all at once.

## Decisions

- **Values flow in through the seed, names flow out through aliases.** A consumer's palette reaches
  the library only through `ThemeSeed` and `createTheme`. Nothing aliases onto a seed or onto a
  derived ramp step in the other direction, because that bypasses the ramps that keep hover,
  press, wash and dark variants coherent. A consumer's semantic name is an alias *onto* a role
  token (`--hatua-surface-card: var(--vpg-surface-raised)`), never the other way round.
- **The library ships no seam.** No `aliases` prop on `ThemeProvider`, no extra `--vpg-*` hook, no
  mapping table in `createTheme`. A seam is a second public contract to version, and
  ADR-0009 already refuses a `--vpg-*` name the theme does not assign for a consumer to hook.
- **The alias layer is a static class on every `ThemeProvider`.** An alias holding `var(--vpg-x)`
  resolves on the element that declares it, and descendants inherit the resolved value. Declared
  on `:root` it sits above every `.vpg-root` and resolves to nothing. Declared once on an outer
  provider, it hands a nested provider's subtree the outer theme's values. So the consumer writes
  the aliases as one class (`.hatua-theme { --hatua-surface-card: var(--vpg-surface-raised); … }`)
  and passes it as `className` to **every** `ThemeProvider` it mounts, nested ones included, usually
  through a single wrapper component of its own. The `style` prop is not the mechanism:
  `ThemeProvider` renders `{ ...theme, ...style }`, so a `style` entry that names a theme property
  silently overrides it, and inline aliases are invisible to a test that reads the stylesheet.
  Forwarding `className` is the library's whole part.
- **The public contract is the named role families.** Once consumers alias onto `--vpg-*`, the
  names are API. The contract is the families `CONTEXT.md` names — the colour roles and their
  ramps, the **Size scale**, the icon steps, the **Spacing scale**, the **Type scale**,
  **Motion tokens**, **Elevation**, the **Stacking scale** and the **Focus ring** — as emitted by
  `createTheme` and the base stylesheet. Renaming or removing a name in them, or changing the role
  it plays, is a breaking change under the project's single version (ADR-0015); adding a name is
  not. A component-scoped name (`--vpg-button-height-md`) is not contract, and none may be
  introduced (ADR-0009).
- **A gap closes on the consumer's side.** When a consumer's name has no equivalent role, the
  consumer aliases the nearest role (`--hatua-border-subtle: var(--vpg-border)`) or derives from a
  contract token (`color-mix(in oklch, var(--vpg-border) 50%, transparent)`). The library adds a
  role only when one of its own components needs it; a consumer's wish alone does not qualify,
  because every addition is contract the library keeps. A role several consumers need and no
  component does is a separate issue proposing it.

## Considered options

- **Adopt `--vpg-*` directly and delete the consumer's layer in one migration.** Cleanest end
  state, but it makes onboarding all-or-nothing: no primitive can be replaced until every read in
  the repo is rewritten, which is the blocker this ADR exists to remove.
- **A documented mapping seam shipped by the library** (an alias-map prop on `ThemeProvider`, or
  published alias presets). Saves the consumer one CSS block and costs the library a second public
  contract plus a theming hook of the kind ADR-0009 disclaims.
- **Aliases through the `style` prop.** Rejected for the override and testability reasons above.
- **Adding `--vpg-border-subtle` now for `hatua`.** Rejected: no library component needs a border
  weaker than `--vpg-border`, and a name added on one consumer's behalf stays forever.

## Consequences

- Onboarding is rolling: a consumer's primitives and this library's components coexist, both
  reading from the same root, until the last consumer primitive is replaced and the alias class is
  deleted.
- A consumer that mounts a `ThemeProvider` without the alias class gets the library's components
  themed and its own primitives unthemed inside that subtree. The failure is visible the first time
  it renders.
- Renames in the contract families cost a major version, so a role name is chosen once.
