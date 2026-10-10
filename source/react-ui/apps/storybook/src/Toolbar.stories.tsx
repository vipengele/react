import type { Meta, StoryObj } from "@storybook/react-vite";
import { ChevronDown } from "@vipengele/react-icons";
import { Button, ButtonGroup, Menu, MenuButton, Toolbar } from "@vipengele/react-ui";

const meta = {
  title: "Components/Toolbar",
  component: Toolbar,
  args: { "aria-label": "Text formatting" },
} satisfies Meta<typeof Toolbar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <Toolbar {...args}>
      <Button variant="secondary">Bold</Button>
      <Button variant="secondary">Italic</Button>
      <Button variant="secondary">Underline</Button>
    </Toolbar>
  ),
};

export const Vertical: Story = {
  args: { orientation: "vertical" },
  render: (args) => (
    <Toolbar {...args}>
      <Button variant="secondary">Bold</Button>
      <Button variant="secondary">Italic</Button>
      <Button variant="secondary">Underline</Button>
    </Toolbar>
  ),
};

export const WithButtonGroup: Story = {
  name: "With ButtonGroup and MenuButton",
  render: (args) => (
    <Toolbar {...args}>
      <ButtonGroup>
        <Button variant="secondary">Left</Button>
        <Button variant="secondary">Centre</Button>
        <Button variant="secondary">Right</Button>
      </ButtonGroup>
      <MenuButton label="Style" variant="secondary" trailingIcon={ChevronDown}>
        <Menu.Item>Heading</Menu.Item>
        <Menu.Item>Paragraph</Menu.Item>
      </MenuButton>
    </Toolbar>
  ),
};

export const DisabledItem: Story = {
  name: "Disabled item",
  render: (args) => (
    <Toolbar {...args}>
      <Button variant="secondary">Cut</Button>
      <Button variant="secondary" aria-disabled="true">
        Paste
      </Button>
      <Button variant="secondary">Select all</Button>
    </Toolbar>
  ),
};
