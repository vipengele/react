import type { Meta, StoryObj } from "@storybook/react-vite";
import { Tabs, Typography } from "@tandiko/ui";
import { useState } from "react";

const meta = {
  title: "Components/Tabs",
  component: Tabs,
} satisfies Meta<typeof Tabs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Tabs>
      <Tabs.List>
        <Tabs.Tab value="overview">Overview</Tabs.Tab>
        <Tabs.Tab value="activity">Activity</Tabs.Tab>
        <Tabs.Tab value="settings">Settings</Tabs.Tab>
      </Tabs.List>
      <Tabs.Panel value="overview">
        <Typography variant="body-md">
          With neither `value` nor `defaultValue`, the first tab starts selected.
        </Typography>
      </Tabs.Panel>
      <Tabs.Panel value="activity">
        <Typography variant="body-md">Arrow keys move focus and select in one step.</Typography>
      </Tabs.Panel>
      <Tabs.Panel value="settings">
        <Typography variant="body-md">`Home` and `End` jump to the first and last tab.</Typography>
      </Tabs.Panel>
    </Tabs>
  ),
};

export const Vertical: Story = {
  render: () => (
    <Tabs orientation="vertical" defaultValue="activity">
      <Tabs.List aria-label="Project sections">
        <Tabs.Tab value="overview">Overview</Tabs.Tab>
        <Tabs.Tab value="activity">Activity</Tabs.Tab>
        <Tabs.Tab value="settings">Settings</Tabs.Tab>
      </Tabs.List>
      <Tabs.Panel value="overview">
        <Typography variant="body-md">Overview</Typography>
      </Tabs.Panel>
      <Tabs.Panel value="activity">
        <Typography variant="body-md">
          A vertical list traverses with Up/Down and sits beside its panel.
        </Typography>
      </Tabs.Panel>
      <Tabs.Panel value="settings">
        <Typography variant="body-md">Settings</Typography>
      </Tabs.Panel>
    </Tabs>
  ),
};

export const DisabledTab: Story = {
  name: "Disabled tab",
  render: () => (
    <Tabs>
      <Tabs.List>
        <Tabs.Tab value="overview">Overview</Tabs.Tab>
        <Tabs.Tab value="activity" disabled>
          Activity
        </Tabs.Tab>
        <Tabs.Tab value="settings">Settings</Tabs.Tab>
      </Tabs.List>
      <Tabs.Panel value="overview">
        <Typography variant="body-md">
          Keyboard traversal skips the disabled tab: Right goes straight to Settings.
        </Typography>
      </Tabs.Panel>
      <Tabs.Panel value="activity">
        <Typography variant="body-md">Unreachable.</Typography>
      </Tabs.Panel>
      <Tabs.Panel value="settings">
        <Typography variant="body-md">Settings</Typography>
      </Tabs.Panel>
    </Tabs>
  ),
};

function ControlledTabs() {
  const [value, setValue] = useState("activity");

  return (
    <>
      <Typography variant="body-sm" color="secondary">
        Selected: {value}
      </Typography>
      <Tabs value={value} onChange={setValue}>
        <Tabs.List>
          <Tabs.Tab value="overview">Overview</Tabs.Tab>
          <Tabs.Tab value="activity">Activity</Tabs.Tab>
          <Tabs.Tab value="settings">Settings</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="overview">
          <Typography variant="body-md">Overview</Typography>
        </Tabs.Panel>
        <Tabs.Panel value="activity">
          <Typography variant="body-md">
            The selected value lives in the consumer's own state.
          </Typography>
        </Tabs.Panel>
        <Tabs.Panel value="settings">
          <Typography variant="body-md">Settings</Typography>
        </Tabs.Panel>
      </Tabs>
    </>
  );
}

export const Controlled: Story = {
  render: () => <ControlledTabs />,
};
