import type { Meta, StoryObj } from "@storybook/react-vite";
import { createTheme, ThemeProvider } from "@vipengele/react-tokens";
import { Toggle } from "@vipengele/react-ui";

const meta = {
  title: "Components/Toggle",
  component: Toggle,
  args: { "aria-label": "Enable notifications" },
} satisfies Meta<typeof Toggle>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Checked: Story = {
  args: { defaultChecked: true },
};

export const Disabled: Story = {
  args: { disabled: true },
};

export const DisabledChecked: Story = {
  args: { disabled: true, defaultChecked: true },
};

/** The thumb takes its colour from the track it rests on: `--vpg-accent-contrast` over the
 * accent-coloured on track, `--vpg-surface-raised` over the sunken off track. A light accent
 * is the seed that separates the two — it drives `--vpg-accent-contrast` dark, which reads on
 * the on track and would disappear into the off one. Switch the toolbar to dark mode to see both
 * thumbs stay visible. */
export const LightAccentSeed: Story = {
  render: (_args, context) => (
    <ThemeProvider
      colorMode={context.globals.colorMode}
      theme={createTheme({ accent: "oklch(0.82 0.16 95)" })}
      style={{
        display: "flex",
        gap: "var(--vpg-space-4)",
        background: "var(--vpg-surface)",
        padding: "var(--vpg-space-4)",
      }}
    >
      <Toggle aria-label="Off, light accent" />
      <Toggle aria-label="On, light accent" defaultChecked />
    </ThemeProvider>
  ),
};
