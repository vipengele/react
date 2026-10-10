import type { Meta, StoryObj } from "@storybook/react-vite";
import { AlertCircle, Check, Icon, Info, Plus, Search, User } from "@vipengele/react-icons";
import { SideNav, Typography } from "@vipengele/react-ui";
import { type AnchorHTMLAttributes, type MouseEvent, type ReactNode, useState } from "react";

const meta = {
  title: "Components/SideNav",
  component: SideNav,
} satisfies Meta<typeof SideNav>;

export default meta;

type Story = StoryObj<typeof meta>;

/** A bounded-height frame, so the nav reads as a sidebar beside the page it navigates. */
function Frame({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: "flex", height: "28rem", border: "1px solid var(--vpg-border)" }}>
      <div style={{ overflowY: "auto" }}>{children}</div>
      <main style={{ flex: 1, padding: "var(--vpg-space-4)" }}>
        <Typography variant="body-md">Page content</Typography>
      </main>
    </div>
  );
}

export const Default: Story = {
  render: () => (
    <Frame>
      <SideNav aria-label="Workspace" defaultCollapsed={false}>
        <SideNav.Item href="#overview" icon={<Icon icon={Info} />} label="Overview" current />
        <SideNav.Item href="#search" icon={<Icon icon={Search} />} label="Search" />
        <SideNav.Item href="#members" icon={<Icon icon={User} />} label="Members" />
        <SideNav.CollapseToggle />
      </SideNav>
    </Frame>
  ),
};

export const WithSections: Story = {
  name: "With sections",
  render: () => (
    <Frame>
      <SideNav aria-label="Workspace">
        <SideNav.Item href="#overview" icon={<Icon icon={Info} />} label="Overview" />
        <SideNav.Section label="People" icon={<Icon icon={User} />} defaultOpen>
          <SideNav.Item href="#members" icon={<Icon icon={User} />} label="Members" />
          <SideNav.Item href="#invite" icon={<Icon icon={Plus} />} label="Invite" />
        </SideNav.Section>
        <SideNav.Section label="Reports" icon={<Icon icon={Search} />}>
          <SideNav.Item href="#usage" icon={<Icon icon={Info} />} label="Usage" />
          <SideNav.Item href="#incidents" icon={<Icon icon={AlertCircle} />} label="Incidents" />
        </SideNav.Section>
        <SideNav.CollapseToggle />
      </SideNav>
    </Frame>
  ),
};

export const Collapsed: Story = {
  render: () => (
    <Frame>
      {/* In the rail each item is its icon with the label as a tooltip, and each section is one
          icon button opening a flyout of its rows. */}
      <SideNav aria-label="Workspace" defaultCollapsed>
        <SideNav.Item href="#overview" icon={<Icon icon={Info} />} label="Overview" current />
        <SideNav.Section label="People" icon={<Icon icon={User} />}>
          <SideNav.Item href="#members" icon={<Icon icon={User} />} label="Members" />
          <SideNav.Item href="#invite" icon={<Icon icon={Plus} />} label="Invite" />
        </SideNav.Section>
        <SideNav.CollapseToggle />
      </SideNav>
    </Frame>
  ),
};

export const ControlledCollapse: Story = {
  name: "Controlled collapse",
  render: () => {
    const [collapsed, setCollapsed] = useState(false);

    return (
      <Frame>
        <SideNav aria-label="Workspace" collapsed={collapsed} onCollapsedChange={setCollapsed}>
          <SideNav.Item href="#overview" icon={<Icon icon={Info} />} label="Overview" current />
          <SideNav.Item href="#members" icon={<Icon icon={User} />} label="Members" />
          {/* The toggle only requests a change; the owner of the state decides whether it lands. */}
          <SideNav.CollapseToggle label={collapsed ? "Expand navigation" : "Collapse navigation"} />
        </SideNav>
      </Frame>
    );
  },
};

interface RouterLinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> {
  to: string;
  onNavigate: (to: string) => void;
}

/** Stands in for a router's link: it computes its own `href` from `to` and navigates on click
 * instead of following the anchor. */
function RouterLink({ to, onNavigate, onClick, ...rest }: RouterLinkProps) {
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    event.preventDefault();
    onNavigate(to);
  };

  return <a {...rest} href={`#${to}`} onClick={handleClick} />;
}

export const RouterLinkAs: Story = {
  name: "Router link",
  render: () => {
    const [path, setPath] = useState("/inbox");

    return (
      <Frame>
        <SideNav aria-label="Mail">
          {/* `as` swaps the rendered element and forwards `to` and `onNavigate` to it; the
              consumer, which owns the location, marks the current item. */}
          <SideNav.Item
            as={RouterLink}
            to="/inbox"
            onNavigate={setPath}
            icon={<Icon icon={Info} />}
            label="Inbox"
            current={path === "/inbox"}
          />
          <SideNav.Item
            as={RouterLink}
            to="/sent"
            onNavigate={setPath}
            icon={<Icon icon={Check} />}
            label="Sent"
            current={path === "/sent"}
          />
          <SideNav.Item
            as={RouterLink}
            to="/spam"
            onNavigate={setPath}
            icon={<Icon icon={AlertCircle} />}
            label="Spam"
            current={path === "/spam"}
          />
          <SideNav.CollapseToggle />
        </SideNav>
      </Frame>
    );
  },
};

export const DeepNesting: Story = {
  name: "Deep nesting",
  render: () => (
    <Frame>
      <SideNav aria-label="Admin">
        <SideNav.Section label="Organisation" icon={<Icon icon={User} />} defaultOpen>
          <SideNav.Item href="#profile" icon={<Icon icon={Info} />} label="Profile" />
          <SideNav.Section label="Teams" icon={<Icon icon={User} />} defaultOpen>
            <SideNav.Item href="#all-teams" icon={<Icon icon={Search} />} label="All teams" />
            <SideNav.Section label="Engineering" icon={<Icon icon={Plus} />} defaultOpen>
              <SideNav.Item href="#platform" icon={<Icon icon={Check} />} label="Platform" />
              <SideNav.Item href="#product" icon={<Icon icon={Check} />} label="Product" />
            </SideNav.Section>
          </SideNav.Section>
        </SideNav.Section>
        <SideNav.CollapseToggle />
      </SideNav>
    </Frame>
  ),
};

export const CurrentInSection: Story = {
  name: "Current item in a closed section",
  render: () => (
    <Frame>
      {/* The current item opens every section around it, so the nav shows where the user is
          without the sections being opened by hand. */}
      <SideNav aria-label="Admin">
        <SideNav.Item href="#overview" icon={<Icon icon={Info} />} label="Overview" />
        <SideNav.Section label="Organisation" icon={<Icon icon={User} />}>
          <SideNav.Section label="Teams" icon={<Icon icon={User} />}>
            <SideNav.Item href="#platform" icon={<Icon icon={Check} />} label="Platform" current />
            <SideNav.Item href="#product" icon={<Icon icon={Check} />} label="Product" />
          </SideNav.Section>
        </SideNav.Section>
        <SideNav.Section label="Billing" icon={<Icon icon={AlertCircle} />}>
          <SideNav.Item href="#invoices" icon={<Icon icon={Info} />} label="Invoices" />
        </SideNav.Section>
        <SideNav.CollapseToggle />
      </SideNav>
    </Frame>
  ),
};
