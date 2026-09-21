import type { Meta, StoryObj } from "@storybook/react-vite";
import { Icon, Search } from "@vipengele/react-icons";
import { createTheme, ThemeProvider } from "@vipengele/react-tokens";
import { Button, StatePanel } from "@vipengele/react-ui";

const meta = {
  title: "Components/StatePanel",
  component: StatePanel,
  args: {
    title: "Nothing here yet",
    description: "Items you create will show up in this list.",
  },
} satisfies Meta<typeof StatePanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Each variant with `media` left unset, so it shows the variant's own illustration. */
export const Empty: Story = {
  args: { variant: "empty", title: "No projects", description: "Create a project to get started." },
};

export const ErrorState: Story = {
  name: "Error",
  args: { variant: "error", title: "Something went wrong", description: "We could not load your projects." },
};

export const NotFound: Story = {
  args: { variant: "not-found", title: "Page not found", description: "The page you asked for does not exist." },
};

export const Variants: Story = {
  render: () => (
    <div style={{ display: "grid", gap: "2rem" }}>
      <StatePanel variant="empty" title="No projects" description="Create a project to get started." />
      <StatePanel variant="error" title="Something went wrong" description="We could not load your projects." />
      <StatePanel variant="not-found" title="Page not found" description="The page you asked for does not exist." />
    </div>
  ),
};

/** A media node replaces the variant's illustration. The slot does not size its content, so the
 * icon is sized at the call site. */
export const WithMedia: Story = {
  args: {
    title: "No results",
    description: "Try a different search term.",
    media: <Icon icon={Search} size={48} />,
  },
};

export const WithActions: Story = {
  args: {
    variant: "error",
    title: "Something went wrong",
    description: "We could not load this page.",
  },
  render: (args) => (
    <StatePanel {...args}>
      <Button>Try again</Button>
      <Button variant="secondary">Go back home</Button>
    </StatePanel>
  ),
};

/** Every `titleAs` element carries the same visual style. */
export const TitleLevels: Story = {
  render: () => (
    <div style={{ display: "grid", gap: "1.5rem" }}>
      {(["h1", "h2", "h3", "h4", "h5", "h6", "p", "div"] as const).map((titleAs) => (
        <StatePanel key={titleAs} titleAs={titleAs} title={`Title as ${titleAs}`} />
      ))}
    </div>
  ),
};

/** Nests a seeded `ThemeProvider` and forwards the toolbar's colorMode so the panel follows
 * both the seed and the colour mode. */
export const Themed: Story = {
  render: (args, context) => (
    <ThemeProvider
      colorMode={context.globals.colorMode}
      theme={createTheme({
        accent: "oklch(0.6 0.2 150)",
        ink: "oklch(0.2 0.02 150)",
        surface: "oklch(0.98 0.01 150)",
        radius: "1rem",
      })}
      style={{
        background: "var(--vpg-surface)",
        color: "var(--vpg-ink)",
        padding: "var(--vpg-radius-lg)",
        borderRadius: "var(--vpg-radius)",
      }}
    >
      <StatePanel {...args}>
        <Button>Create item</Button>
      </StatePanel>
    </ThemeProvider>
  ),
};

export const Dark: Story = {
  globals: { colorMode: "dark" },
  render: Themed.render,
};
