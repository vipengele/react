import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button, Card, Typography } from "@tandiko/ui";

const meta = {
  title: "Components/Card",
  component: Card,
  // `children` is a required prop; every story below overrides this via `render`, but
  // `StoryObj<typeof meta>` still needs a default that type-checks against it.
  args: {
    children: (
      <Card.Content>
        <Typography variant="body-md">Card content</Typography>
      </Card.Content>
    ),
  },
} satisfies Meta<typeof Card>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div style={{ maxWidth: "20rem" }}>
      <Card>
        <Card.Header>
          <Typography variant="h4">Card title</Typography>
        </Card.Header>
        <Card.Content>
          <Typography variant="body-md" color="secondary">
            Card content describes the surface's subject in a sentence or two.
          </Typography>
        </Card.Content>
        <Card.Footer>
          <Button variant="secondary">Cancel</Button>
          <Button>Confirm</Button>
        </Card.Footer>
      </Card>
    </div>
  ),
};

export const ContentOnly: Story = {
  render: () => (
    <div style={{ maxWidth: "20rem" }}>
      <Card>
        <Card.Content>
          <Typography variant="body-md">A card can carry only content.</Typography>
        </Card.Content>
      </Card>
    </div>
  ),
};

export const OrderIsCssDriven: Story = {
  name: "Layout order is CSS-driven",
  render: () => (
    <div style={{ maxWidth: "20rem" }}>
      <Card>
        <Card.Footer>
          <Button variant="secondary">Written first in JSX</Button>
        </Card.Footer>
        <Card.Header>
          <Typography variant="h4">Still renders on top</Typography>
        </Card.Header>
        <Card.Content>
          <Typography variant="body-md" color="secondary">
            `Card.Header`, `.Content`, and `.Footer` can appear in any JSX order and still render header above content above footer.
          </Typography>
        </Card.Content>
      </Card>
    </div>
  ),
};

export const Interactive: Story = {
  render: () => (
    <div style={{ maxWidth: "20rem" }}>
      <Card onClick={() => {}}>
        <Card.Header>
          <Typography variant="h4">Interactive card</Typography>
        </Card.Header>
        <Card.Content>
          <Typography variant="body-md" color="secondary">
            Passing `onClick` makes the whole surface a focusable, keyboard-activatable target.
          </Typography>
        </Card.Content>
      </Card>
    </div>
  ),
};
