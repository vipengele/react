import type { Meta, StoryObj } from "@storybook/react-vite";
import { Disclosure, type DisclosureProps, Typography } from "@vipengele/react-ui";
import { useState } from "react";

const meta = {
  title: "Components/Disclosure",
  component: Disclosure,
  args: {
    label: "What is your refund policy?",
    children: (
      <Typography variant="body-md">
        You can request a full refund within 30 days of purchase. After that, we refund the unused part of your plan.
      </Typography>
    ),
  },
} satisfies Meta<typeof Disclosure>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const DefaultOpen: Story = {
  name: "Default open",
  args: { defaultOpen: true },
};

function ControlledDisclosure(props: DisclosureProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Typography variant="body-sm" color="secondary">
        Open: {String(open)}
      </Typography>
      <Disclosure {...props} open={open} onOpenChange={setOpen} />
    </>
  );
}

export const Controlled: Story = {
  render: (args) => <ControlledDisclosure {...args} />,
};

export const Disabled: Story = {
  args: { label: "Can I change my plan later?", disabled: true },
};
