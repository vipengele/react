# Link's external affordance is an explicit prop, not inferred from href

`Link` can render as a foreign routing library's link component via its `as` prop (following
`Typography`'s polymorphic pattern), so the string passed as `href`/`to` is whatever that
router expects — a relative path, a route object serialized by the caller, a custom scheme —
and the component has no reliable way to compare it against "the current origin" to infer
whether it leaves the app. We take an explicit `external` boolean instead: the caller states it,
and `Link` uses it to default `target="_blank" rel="noopener noreferrer"`, render the
external-link icon, and add the visually-hidden "opens in a new tab" text. `href`-sniffing
(absolute URL, different origin) would work for a plain anchor but silently stop working the
moment `as` points at a router component, which is exactly the composition path this component
exists to support.
