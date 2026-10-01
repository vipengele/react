---
about: ADR-0019 governs layout primitives; Checkbox row was changed from inline-flex to flex+fit-content, so FieldSet stacks children itself
saw:
  - docs/adr/0019-layout-primitives-accept-token-values-only.md
  - source/react-ui/packages/ui/AGENTS.md
  - source/react-ui/packages/ui/src/Checkbox/Checkbox.stylesheet.ts
  - source/react-ui/packages/ui/src/FieldSet/FieldSet.stylesheet.ts
  - source/react-ui/packages/ui/vitest.config.ts
---

Cost: ~30 tool calls across ADRs, rules, issues #40/#54/#85.

- Per-instance values in a shared stylesheet: inline component-scoped `--vpg-<primitive>-<prop>` set to `var(--vpg-space-N)`/`0`/mapped keyword/number; props are closed unions (ADR-0019). Rejected: arbitrary-length escape hatch, class-per-value, data-attribute selectors (stylesheet growth), `--vpgi-` prefix, resolving to a length in JS (stops following theme). Existing components (Typography `variant`, Skeleton) use class modifiers; Skeleton/Textarea set plain CSS props inline.
- The "never assign --vpg-* inline" rule is narrowed for primitives (`.agents/rules/never-assign-theme-properties-inline.md`).
- Sub-issues of #40 (Wave 1): #54 Stack, #55 Inline, #56 Grid, #57 Center/Container, #58 AspectRatio. Neither #40 nor #54 records shared prop names; ADR-0019 explicitly leaves exact prop names, defaults and responsive values uncommitted. Alignment is a closed keyword union (start/center/end/stretch/baseline, between on justify).
- Checkbox PR #85 (merged 2026-09-21) described the row as `inline-flex` so rows sit side by side in a FieldSet. The current code is `display:flex; width:fit-content` (`Checkbox.stylesheet.ts:96-97`, comment says so rows stack), and FieldSet's `.vpg-fieldset-body` is flex-column `gap: var(--vpg-space-5)` (`FieldSet.stylesheet.ts:48-52`). So the PR text is superseded: FieldSet stacks children itself, no Stack needed.
- Polymorphism: only Typography has `as` (`Typography.tsx:36-48`, `ComponentPropsWithoutRef<C>`); no forwardRef anywhere in `ui/src`; `ref` is a plain prop (React 19, per PR #85 text).
- Coverage: v8, 100% on `src/**` incl. `internal/`, thresholds in `vitest.config.ts`; jsdom project excludes `*.browser.test.*`; chromium project includes them. New components also need bundle-check entry and Storybook stories in the same PR.
