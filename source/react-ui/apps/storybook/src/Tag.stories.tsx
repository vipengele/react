import type { Meta, StoryObj } from "@storybook/react-vite";
import { Check } from "@vipengele/react-icons";
import { Tag } from "@vipengele/react-ui";
import { useState } from "react";

const meta = {
  title: "Components/Tag",
  component: Tag,
  args: { children: "Tag", onRemove: () => {} },
} satisfies Meta<typeof Tag>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const VariantsAndEmphasis: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {(["subtle", "solid"] as const).map((emphasis) => (
        <div key={emphasis} style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          {(["neutral", "accent", "danger"] as const).map((variant) => (
            <Tag key={variant} variant={variant} emphasis={emphasis} onRemove={() => {}}>
              {`${variant} ${emphasis}`}
            </Tag>
          ))}
        </div>
      ))}
    </div>
  ),
};

function RemovableTags() {
  const [tags, setTags] = useState(["Design", "Engineering", "Research", "Support"]);

  return (
    <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
      {tags.map((tag) => (
        <Tag key={tag} onRemove={() => setTags((current) => current.filter((t) => t !== tag))}>
          {tag}
        </Tag>
      ))}
    </div>
  );
}

export const Removable: Story = {
  render: () => <RemovableTags />,
};

// The label is an element rather than a string, so the tag cannot quote it and `removeLabel`
// names the remove button.
export const WithIcon: Story = {
  args: {
    variant: "accent",
    icon: <Check />,
    children: <strong>Verified</strong>,
    removeLabel: "Remove Verified",
  },
};
