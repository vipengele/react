# The brand is its own repo, consumed as a published package

The brand artwork lives in `vipengele/brand` and is consumed here as the published
`@vipengele/brand`. It is not a package of `source/react-ui`.

The Storybook depends on it for the sidebar lockup. Nothing else in this repo does.

## Why the brand is not part of the design system

The brand belongs to the org, not to React. A `.NET` service rendering an email header, a
marketing site, and a Go CLI printing a banner all need the mark, and none of them can take a
dependency on a package that lives inside the React design system's workspace. Keeping the
artwork here would have made every non-React consumer either vendor a copy or depend on
`vipengele/react`, and a vendored copy of a logo is how two versions of a brand start circulating.

It also removes a coupling that was never real: `packages/brand` sat in `source/react-ui`'s
workspace and was built by its turbo graph, but carried no React, no TypeScript and no tests. The
only thing tying it here was history.

## Consequences

This is the first **cross-project dependency** — the case ADR-0015 anticipated when it ruled that
such a dependency is an ordinary published range rather than `workspace:*`. Two consequences
landed with it:

- `pnpm-workspace.yaml`'s `minimumReleaseAge` of one week applies to newly published versions, and
  it does not distinguish first-party from third-party. Left alone, a freshly released
  `@vipengele/brand` would be uninstallable here for seven days, making "release the producer,
  then consume it" a fortnight-long operation. `@vipengele/*` is therefore exempted via
  `minimumReleaseAgeExclude`: the cooldown buys time for a hijacked release to be noticed by
  someone else before it is installed, and these are published from this org's own repositories by
  trusted publishing, with provenance, from a tag a human pushed.
- Updating the brand is now a release of `vipengele/brand` followed by a dependency bump here,
  rather than an edit. That is the cost of the artwork being usable outside React, and Dependabot
  raises the bump.

The Storybook reaches the vectors through `staticDirs` pointed at the installed package's `dist/`,
because `brandImage` takes a URL and cannot resolve a package export. A `staticDirs` entry naming
a path that does not exist is **not** a build failure — Storybook builds and the sidebar renders a
broken image — so changing it is verified by loading the built site, not by CI going green.

## Considered options

- **Keep `packages/brand` and publish it from here.** Rejected: its trusted publisher would bind
  to `vipengele/react`, so the brand's releases would forever be tied to the React repo's release
  train, and every non-React consumer would depend on the design system to get a logo.
- **Vendor the artwork into each consumer.** Rejected outright — copies drift, and a brand whose
  copies drift is not a brand.
