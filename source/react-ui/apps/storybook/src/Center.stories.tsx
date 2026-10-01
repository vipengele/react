import type { Meta, StoryObj } from "@storybook/react-vite";
import { Center, type CenterMax, Stack, Typography } from "@vipengele/react-ui";
import type { CSSProperties } from "react";

const meta = {
  title: "Layout/Center",
  component: Center,
} satisfies Meta<typeof Center>;

export default meta;

type Story = StoryObj<typeof meta>;

const boxStyle: CSSProperties = {
  padding: "var(--vpg-space-2) var(--vpg-space-3)",
  border: "1px solid var(--vpg-border-strong)",
  borderRadius: "var(--vpg-radius)",
  background: "var(--vpg-surface-raised)",
};

const frameStyle: CSSProperties = {
  border: "1px dashed var(--vpg-border)",
  borderRadius: "var(--vpg-radius)",
};

function Box({ children }: { children: string }) {
  return <div style={boxStyle}>{children}</div>;
}

const maxes: readonly CenterMax[] = ["sm", "md", "lg", "xl"];

const insets = ["none", "space-2", "space-4", "space-6", "space-8"] as const;

export const Default: Story = {
  render: (args) => (
    <div style={frameStyle}>
      <Center {...args}>
        <Box>Content capped at the width scale step and centred</Box>
      </Center>
    </div>
  ),
};

export const MaxWidths: Story = {
  name: "Max widths",
  render: () => (
    <Stack gap="space-6">
      {maxes.map((max) => (
        <Stack key={max} gap="space-2">
          <Typography variant="body-sm" color="secondary">
            max="{max}"
          </Typography>
          <div style={frameStyle}>
            <Center max={max}>
              <Box>Outer width never grows past this step</Box>
            </Center>
          </div>
        </Stack>
      ))}
    </Stack>
  ),
};

export const Insets: Story = {
  render: () => (
    <Stack gap="space-6">
      {insets.map((inset) => (
        <Stack key={inset} gap="space-2">
          <Typography variant="body-sm" color="secondary">
            inset="{inset}"
          </Typography>
          <div style={frameStyle}>
            <Center max="sm" inset={inset}>
              <Box>Inline padding keeps this off the edges</Box>
            </Center>
          </div>
        </Stack>
      ))}
    </Stack>
  ),
};

export const Intrinsic: Story = {
  render: () => (
    <Stack gap="space-6">
      {[false, true].map((intrinsic) => (
        <Stack key={String(intrinsic)} gap="space-2">
          <Typography variant="body-sm" color="secondary">
            intrinsic={String(intrinsic)}
          </Typography>
          <div style={frameStyle}>
            <Center max="md" intrinsic={intrinsic}>
              <Box>Short</Box>
              <Box>A somewhat longer child</Box>
            </Center>
          </div>
        </Stack>
      ))}
    </Stack>
  ),
};

export const AsMain: Story = {
  name: "As main",
  render: () => (
    <Center as="main" max="md" inset="space-6">
      <Stack gap="space-3">
        <Typography variant="body-sm" color="secondary">
          Rendered as a main element
        </Typography>
        <Box>Page content</Box>
      </Stack>
    </Center>
  ),
};
