# ErrorBoundary overrides StatePanel's required-title contract with a default

`StatePanel`'s own doc comment states "copy is always supplied by the caller" and makes `title`
a required prop with no default anywhere in the component — `Dropdown` already ships its own
default English strings (`errorMessage`, `placeholder`, and others), so this is a contract of
`StatePanel` specifically, not a library-wide no-default-copy rule. `ErrorBoundary` deliberately
does not honor `StatePanel`'s required-title contract for its default fallback: with no
`fallback`/`title` override, it renders `<StatePanel variant="error" title="Something went
wrong." />` — reusing `Dropdown`'s existing string rather than inventing a second one — as a
literal default.

The reason is what an error boundary is *for*. It exists to catch failures its own author did
not anticipate — that is the premise of needing one at all. A `title` requirement, mandatory the
way `StatePanel` demands everywhere else it's used, would make the safety net itself capable of
failing to render (a missing required prop) at the one moment it has to work unconditionally. A
default closes that gap; `title`, `description` and `fallback` all remain fully overridable for
any caller who wants their own copy or a different node entirely.
