import type { Meta, StoryObj } from "@storybook/react-vite";
import { ChevronDown, Plus, Search } from "@vipengele/react-icons";
import { Button, Menu, MenuButton, Popover, Typography } from "@vipengele/react-ui";
import { useState } from "react";

const meta = {
  title: "Components/Menu",
  component: Menu,
  args: {
    trigger: <Button variant="secondary">Actions</Button>,
    children: (
      <>
        <Menu.Item>Rename</Menu.Item>
        <Menu.Item>Duplicate</Menu.Item>
        <Menu.Item>Archive</Menu.Item>
      </>
    ),
  },
} satisfies Meta<typeof Menu>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const IconsShortcutsAndDisabled: Story = {
  name: "Icons, shortcuts and disabled rows",
  render: () => (
    <Menu trigger={<Button variant="secondary">Actions</Button>}>
      <Menu.Item leadingIcon={<Plus />} shortcut="Ctrl+N">
        New file
      </Menu.Item>
      <Menu.Item leadingIcon={<Search />} shortcut="Ctrl+F">
        Find
      </Menu.Item>
      {/* A disabled row stays a keyboard stop but fires nothing and keeps the menu open. */}
      <Menu.Item disabled shortcut="Ctrl+S">
        Save
      </Menu.Item>
    </Menu>
  ),
};

export const SeparatorsAndGroups: Story = {
  name: "Separators and groups",
  render: () => (
    <Menu trigger={<Button variant="secondary">Actions</Button>}>
      <Menu.Item>Open</Menu.Item>
      <Menu.Item>Open in new window</Menu.Item>
      <Menu.Separator />
      <Menu.Group label="Share">
        <Menu.Item>Copy link</Menu.Item>
        <Menu.Item>Send by email</Menu.Item>
      </Menu.Group>
      <Menu.Separator />
      <Menu.Item>Delete</Menu.Item>
    </Menu>
  ),
};

export const CheckboxItems: Story = {
  name: "Checkbox items",
  render: () => {
    const [showGrid, setShowGrid] = useState(true);
    const [showRulers, setShowRulers] = useState(false);

    return (
      // The caller owns the checked state, and toggling a checkbox row leaves the menu open.
      <Menu trigger={<Button variant="secondary">View</Button>}>
        <Menu.CheckboxItem checked={showGrid} onCheckedChange={setShowGrid}>
          Show grid
        </Menu.CheckboxItem>
        <Menu.CheckboxItem checked={showRulers} onCheckedChange={setShowRulers}>
          Show rulers
        </Menu.CheckboxItem>
      </Menu>
    );
  },
};

export const RadioItems: Story = {
  name: "Radio items",
  render: () => {
    const [sort, setSort] = useState("name");

    return (
      <Menu trigger={<Button variant="secondary">Sort</Button>}>
        {/* A radio row needs its group, which holds the checked value of the set. */}
        <Menu.Group label="Sort by" value={sort} onValueChange={setSort}>
          <Menu.RadioItem value="name">Name</Menu.RadioItem>
          <Menu.RadioItem value="modified">Date modified</Menu.RadioItem>
          <Menu.RadioItem value="size">Size</Menu.RadioItem>
        </Menu.Group>
      </Menu>
    );
  },
};

export const WithMenuButton: Story = {
  name: "MenuButton",
  render: () => (
    <MenuButton label="Options" variant="secondary" trailingIcon={ChevronDown}>
      <Menu.Item>Settings</Menu.Item>
      <Menu.Item>Sign out</Menu.Item>
    </MenuButton>
  ),
};

export const InPopoverPanel: Story = {
  name: "Menu in the popover panel",
  render: () => (
    <div style={{ display: "flex", justifyContent: "center", padding: "8rem" }}>
      <Popover
        content={
          <>
            <Typography variant="body-md">Manage this draft.</Typography>
            {/* The menu portals into the same `.vpg-root` as the panel and sits on a higher layer
                step, so it draws over the panel it opened from. Escape closes the menu first and
                the panel on the next press. */}
            <MenuButton label="More" variant="secondary">
              <Menu.Item>Duplicate</Menu.Item>
              <Menu.Item>Archive</Menu.Item>
            </MenuButton>
          </>
        }
      >
        <Button>Draft</Button>
      </Popover>
    </div>
  ),
};
