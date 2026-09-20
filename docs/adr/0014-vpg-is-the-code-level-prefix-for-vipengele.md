# `vpg` is the code-level prefix, `vipengele` is the name

The library's owner brand is `vipengele`. Everything a person reads — the GitHub org, the repos,
the npm scope (`@vipengele/react-ui`), documentation, the Storybook title, the Pages URL — spells
it out. Everything a consumer types thousands of times in code and CSS carries the short alias
`vpg`: the `--vpg-*` custom properties, the `.vpg-*` classes, the `[data-vpg-mode]` attribute, the
`.vpg-root` class and `@keyframes vpg-*` names.

The rule for any new name: if it is written in prose or an install command it uses `vipengele`; if
it is a prefix on an identifier in code, CSS or markup it uses `vpg`. npm scopes are the exception
that proves the first half — a scope must match the owning org, so packages are `@vipengele/*`.

## Considered options

- **`--vipengele-*` everywhere.** One spelling, but roughly 137 distinct custom properties and
  every class and attribute selector carry a 9-character prefix, and consumers write them by hand.
- **Keep the `tandiko` prefix.** Smallest diff, but Tandiko is a separate platform that consumes
  this library; its name would sit in the owner brand's public styling contract.
- **`--vp-*`.** Shorter still, but too generic to be unambiguous in a shared cascade.

## Consequences

`vpg` says nothing about the brand on its own and is only ever a prefix, never a product name.
Changing the prefix later is a breaking change for every consumer that overrides a token or targets
a class, because components read tokens with no fallback (ADR-0009).
