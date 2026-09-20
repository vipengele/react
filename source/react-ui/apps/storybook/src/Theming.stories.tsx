import type { Meta, StoryObj } from "@storybook/react-vite";
import { createTheme, ThemeProvider } from "@vipengele/react-tokens";

const meta = {
  title: "Foundations/Theming",
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

/** Uses the ambient `ThemeProvider` supplied by the global decorator and its default seed. */
export const DefaultSeed: Story = {
  render: () => (
    <div
      style={{
        background: "var(--vpg-surface)",
        color: "var(--vpg-ink)",
        padding: "var(--vpg-radius-lg)",
        borderRadius: "var(--vpg-radius)",
      }}
    >
      <p>Default seed</p>
      <button
        type="button"
        style={{
          background: "var(--vpg-accent)",
          color: "var(--vpg-accent-contrast)",
          border: "none",
          borderRadius: "var(--vpg-radius-sm)",
          padding: "0.5rem 1rem",
        }}
      >
        Accent button
      </button>
    </div>
  ),
};

/** Nests a second, independently seeded `ThemeProvider` inside the ambient one to show
 * that a custom seed scopes cleanly without leaking into or from the surrounding tree.
 * Forwards the toolbar's colorMode explicitly — a nested ThemeProvider does not inherit
 * mode from an ancestor ThemeProvider (only from an actual `:root`/`prefers-color-scheme`),
 * so a story wanting the toolbar to affect it has to pass colorMode itself. */
export const CustomSeed: Story = {
  render: (_args, context) => (
    <ThemeProvider
      colorMode={context.globals.colorMode}
      theme={createTheme({
        accent: "oklch(0.6 0.2 150)",
        ink: "oklch(0.2 0.02 150)",
        surface: "oklch(0.98 0.01 150)",
        radius: "1rem",
      })}
      style={{
        background: "var(--vpg-surface)",
        color: "var(--vpg-ink)",
        padding: "var(--vpg-radius-lg)",
        borderRadius: "var(--vpg-radius)",
      }}
    >
      <p>Custom seed (green accent, larger radius)</p>
      <button
        type="button"
        style={{
          background: "var(--vpg-accent)",
          color: "var(--vpg-accent-contrast)",
          border: "none",
          borderRadius: "var(--vpg-radius-sm)",
          padding: "0.5rem 1rem",
        }}
      >
        Accent button
      </button>
    </ThemeProvider>
  ),
};
