import type { Meta, StoryObj } from "@storybook/react-vite";
import { AspectRatio, Stack, Typography } from "@vipengele/react-ui";
import type { CSSProperties } from "react";

const PHOTO = "https://picsum.photos/id/1015/1200/800";
const POSTER = "https://picsum.photos/id/1018/1200/800";

const meta = {
  title: "Layout/AspectRatio",
  component: AspectRatio,
} satisfies Meta<typeof AspectRatio>;

export default meta;

type Story = StoryObj<typeof meta>;

const frameStyle: CSSProperties = { maxWidth: "28rem" };

const fillStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  border: "1px solid var(--vpg-border-strong)",
  borderRadius: "var(--vpg-radius)",
  background: "var(--vpg-surface-raised)",
};

const ratios = [
  { label: "1", ratio: 1 },
  { label: "4 / 3", ratio: 4 / 3 },
  { label: "16 / 9", ratio: 16 / 9 },
  { label: "21 / 9", ratio: 21 / 9 },
] as const;

export const Default: Story = {
  render: (args) => (
    <div style={frameStyle}>
      <AspectRatio {...args}>
        <div style={fillStyle}>1 / 1</div>
      </AspectRatio>
    </div>
  ),
};

export const Ratios: Story = {
  render: () => (
    <Stack gap="space-6" style={frameStyle}>
      {ratios.map(({ label, ratio }) => (
        <Stack key={label} gap="space-2">
          <Typography variant="body-sm" color="secondary">
            ratio={"{"}
            {label}
            {"}"}
          </Typography>
          <AspectRatio ratio={ratio}>
            <div style={fillStyle}>{label}</div>
          </AspectRatio>
        </Stack>
      ))}
    </Stack>
  ),
};

export const WithImage: Story = {
  args: { ratio: 16 / 9 },
  render: (args) => (
    <div style={frameStyle}>
      <AspectRatio {...args}>
        <img src={PHOTO} alt="Mountain lake at dawn" />
      </AspectRatio>
    </div>
  ),
};

export const WithEmbed: Story = {
  name: "With embed",
  args: { ratio: 16 / 9 },
  render: (args) => (
    <div style={frameStyle}>
      <AspectRatio {...args}>
        {/* biome-ignore lint/a11y/useMediaCaption: placeholder with no audio track */}
        <video poster={POSTER} controls preload="none" />
      </AspectRatio>
    </div>
  ),
};

export const AsFigure: Story = {
  name: "As figure",
  args: { ratio: 4 / 3 },
  render: (args) => (
    <div style={frameStyle}>
      <AspectRatio {...args} as="figure" style={{ margin: 0 }}>
        <img src={PHOTO} alt="Mountain lake at dawn" />
      </AspectRatio>
    </div>
  ),
};
