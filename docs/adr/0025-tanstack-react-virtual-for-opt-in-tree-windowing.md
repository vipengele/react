# `@tanstack/react-virtual` windows Tree rows when `virtualized` is set

A `Tree` over thousands of expanded rows mounts thousands of DOM nodes. Windowing renders only
the rows in view, plus overscan. `Tree` offers it as opt-in: `virtualized` turns it on and
`rowHeight` gives the fixed row height the windowing arithmetic needs. Without `virtualized`,
every visible row is mounted, which is simpler and right for the common small tree.

Decided: `@vipengele/react-ui` takes `@tanstack/react-virtual` as a real dependency, as it
does `@floating-ui/react` (ADR 0002). Scroll-offset tracking, resize observation, overscan and
scroll-to-index are easy to get subtly wrong and costly to maintain by hand. The library is
headless, which suits a design system that owns its own markup and styling, and its
`rangeExtractor` hook lets `Tree` force the tabbable row to stay mounted, which the focus
model requires (ADR 0024).

## Supply-chain policy

The project's `pnpm-workspace.yaml` enforces `minimumReleaseAge`, `trustPolicy: no-downgrade`
and `blockExoticSubdeps: true`. The pinned version must satisfy all three: it is old enough to
clear the release-age window, it does not lack the provenance or trusted-publisher attestation
that an earlier release carried, and `@tanstack/react-virtual` and its dependency
`@tanstack/virtual-core` bring no git or tarball-URL subdependencies. A version that fails any
of these is not installable, so choose the newest release that passes rather than the latest.

## Considered options

- **Hand-rolled windowing.** Rejected: no new dependency, but it is the same kind of code
  that looks done and isn't, as ADR 0002 found for overlay positioning. It must handle scroll
  containers, resizing, overscan, keeping an arbitrary row mounted, and scroll-to-row for
  keyboard navigation, and every one of those has to be maintained.
