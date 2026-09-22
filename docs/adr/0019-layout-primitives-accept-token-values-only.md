# Layout primitives accept token values only

The layout primitives — `Stack`, `Inline`, `Grid`, `Center`, `AspectRatio` — need different values
on each instance: one stack has a `space-2` gap, the stack next to it has `space-6`, and a grid
might have three columns or four. Every other component in `source/react-ui/packages/ui` gets its
geometry from one static stylesheet. A per-instance value does not fit that model unless it has a
way into the stylesheet.

**The mechanism: a primitive writes its per-instance values as component-scoped custom properties
on its own element, and its one static stylesheet reads them.**

```tsx
<div className="vpg-stack" style={{ "--vpg-stack-gap": "var(--vpg-space-3)" }} />
```

```css
.vpg-stack {
  display: flex;
  flex-direction: column;
  gap: var(--vpg-stack-gap);
}
```

One `<style href="vpg-stack" precedence="vpg-stack">` serves every `Stack` on the page. React 19
hoists it and de-duplicates it by `href`, the same as every other component. There is no class
per value, so no `.vpg-stack-gap-3`, and the stylesheet does not grow with the number of props.

**The guardrail, which is the real substance of this decision: a prop that sets a length accepts
a token name, never an arbitrary value.** `gap="space-3"` is accepted and `gap={13}` is not.
`gap="13px"` and `gap="var(--my-gap)"` are not accepted either. The prop's type is the union of
the spacing scale's step names plus `"none"`. The primitive turns a name into a `var()` read
through a lookup table, so a value the table does not hold is never passed through verbatim, even
by a caller who gets past the type.

Without this restriction, a layout system turns into a utility framework with a very large prop
API. Every CSS property becomes a prop, every prop accepts every length, and the spacing scale
becomes a suggestion. Braid and Chakra both went this way. The spacing scale exists so that two
components placed side by side line up without either knowing the other's measurements
(`CONTEXT.md`, **Spacing scale**). A gap of 13px breaks that the first time someone writes it.

## What is committed

- **Lengths are token names.** Gap, padding and inset props take a spacing-scale step
  (`"space-1"` … `"space-8"`) or `"none"`.
- **`"none"` is a keyword, not a scale step.** It maps to `0`, which the primitive writes as the
  property's value. The theme gets no `--vpg-space-0`: a zero gap is the absence of a
  measurement, and there is nothing to theme about it.
- **The inline value is always a `var()` reference to a theme token, or `0`.** A primitive
  never writes a resolved length inline. The instance therefore keeps following the theme it
  sits under, including a seed change and a colour-mode switch. This is what keeps the narrowed
  rule below safe.
- **A primitive always writes its properties.** Every prop has a default and the primitive sets
  its property from it, so the stylesheet can read `var(--vpg-stack-gap)` bare, as ADR-0009
  requires, with no fallback standing in for an unset prop.
- **Component-scoped properties are named `--vpg-<primitive>-<prop>`.** Examples are
  `--vpg-stack-gap`, `--vpg-grid-columns` and `--vpg-aspect-ratio-ratio`. None of them is a
  name `createTheme` emits, and none may become one.
- **Alignment props take a closed keyword union**, such as `start`, `center`, `end`, `stretch`
  or `baseline`, and `between` on the justify axis. They are set through the same mechanism.
  They are not tokens, but they are closed for the same reason: a prop that accepts any
  `align-items` string is a pass-through to CSS with the primitive as a thin wrapper.
- **Counts and ratios are numbers.** `Grid`'s `columns` is a positive integer and
  `AspectRatio`'s `ratio` is a positive number, such as `16 / 9`. Neither is a length, so no
  scale exists for either, and neither can misalign one component against another. The
  guardrail governs measurements, and a number of tracks or a proportion is not a measurement.

## The inline-assignment rule is narrowed

`packages/ui/AGENTS.md` said that a component may never assign a `--vpg-*` property as an inline
style. The reason given was that an inline declaration beats every stylesheet rule for the same
property on the same element. That includes the base stylesheet's dark-mode reassignment
(ADR-0007), so an inline theme property silently kills colour-mode adaptation for that instance.

That reason applies to names the theme assigns. `--vpg-stack-gap` is not one of them. No
stylesheet reassigns it, so an inline declaration overrides nothing, and its value is a `var()`
read that resolves against whatever the theme holds on that element. The rule becomes:

**A component never assigns a theme-assigned `--vpg-*` name inline. A layout primitive may assign
its own component-scoped property inline, and only to a `var()` read of a theme token, a keyword
it maps to a CSS value, or a count or ratio.**

The existing tests that assert a component's inline style contains no `--vpg-` are still correct
for the components they cover (Tooltip, Dropdown, Spinner, Popover, Textarea, StatePanel,
Skeleton), because none of those components has a component-scoped property. A primitive's own
tests assert the opposite for its own names: the property is present, and its value is a `var()`
read, `0`, a mapped keyword or a number.

A caller's `style` is spread last, as in `Textarea` (ADR-0018), so a caller who writes
`style={{ "--vpg-stack-gap": "13px" }}` gets 13px. That is React's ordinary escape hatch on any
element, not part of the primitive's API. No prop documents it, and nothing in the design system
promises it will keep working.

## What is not committed

- **Which primitives ship, and their exact prop names.** The five above are the set this
  decision was written for. Each lands with its own stories and tests.
- **Default values.** A primitive must have one for every prop (see above). Which step it is
  gets decided with the component.
- **Responsive values**, meaning a different gap per breakpoint. There are no breakpoint tokens,
  and a responsive prop shape (`gap={{ sm: "space-2", lg: "space-6" }}`) is its own decision.
- **Steps larger than `space-8`.** The scale tops out at 2rem, which is small for gaps between
  page sections. When a primitive needs a larger gap, the spacing scale gets a new step, the
  path ADR-0009 describes for `size-2xl` and `icon-xl`. The primitive does not accept a length
  outside the scale.
- **A minimum column width for auto-fitting grids.** That is a length, so it would take a token.
  Whether the size scale or the spacing scale supplies it is left to the `Grid` that needs it.

## Considered options

- **An arbitrary-value escape hatch on the prop:** `gap={13}`, `gap="13px"`, or a
  `gap={{ custom: "13px" }}` form next to the token names. It is the most flexible choice, and it
  saves the one caller who really needs 13px from writing their own `div`. Rejected because the
  escape hatch is what gets used. Once a prop accepts a length, the scale is one choice among
  many at every call site, and reviewers have to reject arbitrary values one PR at a time instead
  of the type rejecting them once. A caller who really needs an off-scale gap has two honest
  routes: an ordinary element they style themselves, or a proposal to add a step to the scale.
  Either one leaves the off-scale value visible as a decision someone made.
- **A class per value** (`.vpg-stack-gap-3`, `.vpg-stack-align-center`, and so on). This
  sets nothing inline and keeps the inline-assignment rule unchanged. Rejected because the
  stylesheet grows with the product of props and values. Nine gap values times five alignments
  times the primitives that take both is a utility stylesheet in all but name, and every new step
  on the scale means a new rule in every primitive.
- **Data-attribute selectors** (`data-gap="3"` matched by `[data-gap="3"] { gap:
  var(--vpg-space-3) }`). Token-only props make the set of values finite, so this works without
  anything inline. Rejected for the same growth problem as classes: every step of every scale a
  primitive reads needs its own rule in that primitive's stylesheet. Counts and ratios make it
  worse, because a positive integer has no finite set to enumerate.
- **A component-scoped property under a separate private prefix** (`--vpgi-stack-gap`), so the
  inline-assignment rule stays true word for word. Rejected because it creates a second prefix
  convention alongside ADR-0014 in order to keep a rule's wording rather than its reason. The
  reason is about names the theme assigns, and the narrowed rule states exactly that.
- **Resolving the token to a length in JS** (`style={{ gap: "0.75rem" }}`). This sets a plain
  CSS property inline, the way `Skeleton` and `Textarea` do. Rejected because the primitive would
  have to read the theme at render time, which ADR-0001 rules out, and because the resolved value
  would stop following a `ThemeProvider` further down the tree that changes the scale.
