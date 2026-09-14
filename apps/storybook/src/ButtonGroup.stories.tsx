import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button, ButtonGroup } from "@tandiko/ui";

const meta = {
  title: "Components/ButtonGroup",
  component: ButtonGroup,
} satisfies Meta<typeof ButtonGroup>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <ButtonGroup>
      <Button variant="secondary">Left</Button>
      <Button variant="secondary">Middle</Button>
      <Button variant="secondary">Right</Button>
    </ButtonGroup>
  ),
};

export const Vertical: Story = {
  render: () => (
    <ButtonGroup orientation="vertical">
      <Button variant="secondary">Top</Button>
      <Button variant="secondary">Middle</Button>
      <Button variant="secondary">Bottom</Button>
    </ButtonGroup>
  ),
};

export const Variants: Story = {
  render: () => (
    <div style={{ display: "flex", gap: "1.5rem", alignItems: "center", flexWrap: "wrap" }}>
      {(["primary", "secondary", "ghost", "danger"] as const).map((variant) => (
        <ButtonGroup key={variant}>
          <Button variant={variant}>One</Button>
          <Button variant={variant}>Two</Button>
          <Button variant={variant}>Three</Button>
        </ButtonGroup>
      ))}
    </div>
  ),
};
