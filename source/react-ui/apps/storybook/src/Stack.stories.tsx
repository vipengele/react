import type { Meta, StoryObj } from "@storybook/react-vite";
import { Checkbox, Stack, type StackAlign, type StackJustify, Typography } from "@vipengele/react-ui";
import type { CSSProperties } from "react";

const meta = {
  title: "Layout/Stack",
  component: Stack,
} satisfies Meta<typeof Stack>;

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

function Box({ children, height }: { children: string; height?: string }) {
  return <div style={{ ...boxStyle, height }}>{children}</div>;
}

const gaps = ["none", "space-1", "space-2", "space-3", "space-4", "space-5", "space-6", "space-7", "space-8"] as const;

const alignments: readonly StackAlign[] = ["start", "center", "end", "stretch", "baseline"];

const justifications: readonly StackJustify[] = ["start", "center", "end", "between"];

export const Default: Story = {
  render: (args) => (
    <Stack {...args}>
      <Box>First</Box>
      <Box>Second</Box>
      <Box>Third</Box>
    </Stack>
  ),
};

export const Gaps: Story = {
  render: () => (
    <Stack gap="space-6">
      {gaps.map((gap) => (
        <Stack key={gap} gap="space-2">
          <Typography variant="body-sm" color="secondary">
            gap="{gap}"
          </Typography>
          <div style={frameStyle}>
            <Stack gap={gap}>
              <Box>First</Box>
              <Box>Second</Box>
              <Box>Third</Box>
            </Stack>
          </div>
        </Stack>
      ))}
    </Stack>
  ),
};

export const Alignment: Story = {
  render: () => (
    <Stack gap="space-6">
      {alignments.map((align) => (
        <Stack key={align} gap="space-2">
          <Typography variant="body-sm" color="secondary">
            align="{align}"
          </Typography>
          <div style={frameStyle}>
            <Stack align={align} gap="space-2">
              <Box>Short</Box>
              <Box>A somewhat longer child</Box>
              <Box>Mid length</Box>
            </Stack>
          </div>
        </Stack>
      ))}
    </Stack>
  ),
};

export const Justify: Story = {
  render: () => (
    <Stack gap="space-6">
      {justifications.map((justify) => (
        <Stack key={justify} gap="space-2">
          <Typography variant="body-sm" color="secondary">
            justify="{justify}"
          </Typography>
          <div style={frameStyle}>
            <Stack justify={justify} gap="space-2" style={{ height: "16rem" }}>
              <Box>First</Box>
              <Box>Second</Box>
              <Box>Third</Box>
            </Stack>
          </div>
        </Stack>
      ))}
    </Stack>
  ),
};

export const AsList: Story = {
  name: "As list",
  render: () => (
    <Stack as="ul" gap="space-2" style={{ margin: 0, paddingInlineStart: "var(--vpg-space-5)" }}>
      <li>First item</li>
      <li>Second item</li>
      <li>Third item</li>
    </Stack>
  ),
};

export const StackedCheckboxes: Story = {
  name: "Stacked checkboxes",
  render: () => (
    <Stack gap="space-2">
      <Checkbox label="Email" defaultChecked />
      <Checkbox label="SMS" />
      <Checkbox label="Push" />
    </Stack>
  ),
};
