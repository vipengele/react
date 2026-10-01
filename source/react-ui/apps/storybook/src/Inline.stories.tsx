import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button, Inline, type InlineAlign, type InlineJustify, Stack, Typography } from "@vipengele/react-ui";
import type { CSSProperties } from "react";

const meta = {
  title: "Components/Inline",
  component: Inline,
} satisfies Meta<typeof Inline>;

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

const alignments: readonly InlineAlign[] = ["start", "center", "end", "stretch", "baseline"];

const justifications: readonly InlineJustify[] = ["start", "center", "end", "between"];

const tags = ["Design", "Engineering", "Accessibility", "Tokens", "Themes", "Storybook", "Layout", "Typography"];

export const Default: Story = {
  render: (args) => (
    <Inline {...args}>
      <Box>First</Box>
      <Box>Second</Box>
      <Box>Third</Box>
    </Inline>
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
            <Inline gap={gap}>
              <Box>First</Box>
              <Box>Second</Box>
              <Box>Third</Box>
            </Inline>
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
            <Inline align={align} gap="space-2">
              <Box>Short</Box>
              <Box height="6rem">Tall child</Box>
              <Box>Mid length</Box>
            </Inline>
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
            <Inline justify={justify} gap="space-2">
              <Box>First</Box>
              <Box>Second</Box>
              <Box>Third</Box>
            </Inline>
          </div>
        </Stack>
      ))}
    </Stack>
  ),
};

export const Wrapping: Story = {
  render: () => (
    <div style={{ ...frameStyle, maxWidth: "24rem" }}>
      <Inline gap="space-2">
        {tags.map((tag) => (
          <Box key={tag}>{tag}</Box>
        ))}
      </Inline>
    </div>
  ),
};

export const NoWrap: Story = {
  name: "No wrap",
  render: () => (
    <div style={{ ...frameStyle, maxWidth: "24rem" }}>
      <Inline wrap={false} gap="space-2">
        {tags.map((tag) => (
          <Box key={tag}>{tag}</Box>
        ))}
      </Inline>
    </div>
  ),
};

export const AsList: Story = {
  name: "As list",
  render: () => (
    <Inline as="ul" gap="space-4" style={{ margin: 0, padding: 0, listStyle: "none" }}>
      <li>First item</li>
      <li>Second item</li>
      <li>Third item</li>
    </Inline>
  ),
};

export const ButtonRow: Story = {
  name: "Button row",
  render: () => (
    <Inline justify="end" gap="space-2">
      <Button variant="ghost">Cancel</Button>
      <Button>Save</Button>
    </Inline>
  ),
};
