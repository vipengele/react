import type { Meta, StoryObj } from "@storybook/react-vite";
import { createTheme, ThemeProvider } from "@tandiko/tokens";

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
        background: "var(--tandiko-surface)",
        color: "var(--tandiko-ink)",
        padding: "var(--tandiko-radius-lg)",
        borderRadius: "var(--tandiko-radius)",
      }}
    >
      <p>Default seed</p>
      <button
        type="button"
        style={{
          background: "var(--tandiko-accent)",
          color: "var(--tandiko-accent-contrast)",
          border: "none",
          borderRadius: "var(--tandiko-radius-sm)",
          padding: "0.5rem 1rem",
        }}
      >
        Accent button
      </button>
    </div>
  ),
};

/** Nests a second, independently seeded `ThemeProvider` inside the ambient one to show
 * that a custom seed scopes cleanly without leaking into or from the surrounding tree. */
export const CustomSeed: Story = {
  render: () => (
    <ThemeProvider
      theme={createTheme({
        accent: "oklch(0.6 0.2 150)",
        ink: "oklch(0.2 0.02 150)",
        surface: "oklch(0.98 0.01 150)",
        radius: "1rem",
      })}
      style={{
        background: "var(--tandiko-surface)",
        color: "var(--tandiko-ink)",
        padding: "var(--tandiko-radius-lg)",
        borderRadius: "var(--tandiko-radius)",
      }}
    >
      <p>Custom seed (green accent, larger radius)</p>
      <button
        type="button"
        style={{
          background: "var(--tandiko-accent)",
          color: "var(--tandiko-accent-contrast)",
          border: "none",
          borderRadius: "var(--tandiko-radius-sm)",
          padding: "0.5rem 1rem",
        }}
      >
        Accent button
      </button>
    </ThemeProvider>
  ),
};
