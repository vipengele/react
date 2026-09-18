import type { Meta, StoryObj } from "@storybook/react-vite";
import { AlertCircle, Check, ChevronDown, Icon, Info, Search } from "@tandiko/icons";

const meta = {
  title: "Foundations/Icons",
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const CURATED_ICONS = [
  { name: "Check", component: Check },
  { name: "ChevronDown", component: ChevronDown },
  { name: "Search", component: Search },
  { name: "Info", component: Info },
  { name: "AlertCircle", component: AlertCircle },
];

export const CuratedSet: Story = {
  render: () => (
    <div style={{ display: "flex", gap: "1.5rem", alignItems: "center" }}>
      {CURATED_ICONS.map(({ name, component }) => (
        <figure key={name} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.25rem" }}>
          <Icon icon={component} />
          <figcaption style={{ fontSize: "0.75rem" }}>{name}</figcaption>
        </figure>
      ))}
    </div>
  ),
};
