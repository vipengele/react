import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button, TopNav, Typography } from "@vipengele/react-ui";
import { type AnchorHTMLAttributes, type MouseEvent, type ReactNode, useState } from "react";

const meta = {
  title: "Components/TopNav",
  component: TopNav,
} satisfies Meta<typeof TopNav>;

export default meta;

type Story = StoryObj<typeof meta>;

/** A frame whose width the nav fills, so the story fixes how much room the row has. The nav
 * re-measures whenever that width changes, so resizing the frame's container moves items in and
 * out of the overflow menu. */
function Frame({ width, children }: { width?: string; children: ReactNode }) {
  return <div style={{ width, maxWidth: "100%", border: "1px solid var(--vpg-border)" }}>{children}</div>;
}

export const Default: Story = {
  render: () => (
    <Frame>
      <TopNav aria-label="Workspace">
        <TopNav.Item href="#overview" current>
          Overview
        </TopNav.Item>
        <TopNav.Item href="#projects">Projects</TopNav.Item>
        <TopNav.Item href="#members">Members</TopNav.Item>
        <TopNav.Item href="#settings">Settings</TopNav.Item>
      </TopNav>
    </Frame>
  ),
};

export const Overflow: Story = {
  render: () => (
    <Frame width="22rem">
      {/* The row has room for some of the items; the rest collapse from its end into the overflow
          menu, where each is a link to the same destination. Widen the frame and they return to
          the row. While the current item is collapsed, the trigger carries the selected style. */}
      <TopNav aria-label="Workspace" overflowLabel="More">
        <TopNav.Item href="#overview">Overview</TopNav.Item>
        <TopNav.Item href="#projects">Projects</TopNav.Item>
        <TopNav.Item href="#members">Members</TopNav.Item>
        <TopNav.Item href="#billing">Billing</TopNav.Item>
        <TopNav.Item href="#usage" current>
          Usage
        </TopNav.Item>
        <TopNav.Item href="#settings">Settings</TopNav.Item>
      </TopNav>
    </Frame>
  ),
};

export const WithSlots: Story = {
  name: "With slots",
  render: () => (
    <Frame width="40rem">
      {/* `start` and `end` never collapse: when the row runs out of room, only the items do. */}
      <TopNav
        aria-label="Workspace"
        start={
          <Typography as="span" variant="h4">
            Vipengele
          </Typography>
        }
        end={<Button size="sm">Sign in</Button>}
      >
        <TopNav.Item href="#overview" current>
          Overview
        </TopNav.Item>
        <TopNav.Item href="#projects">Projects</TopNav.Item>
        <TopNav.Item href="#members">Members</TopNav.Item>
        <TopNav.Item href="#billing">Billing</TopNav.Item>
        <TopNav.Item href="#usage">Usage</TopNav.Item>
        <TopNav.Item href="#settings">Settings</TopNav.Item>
      </TopNav>
    </Frame>
  ),
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
      <Frame width="22rem">
        {/* `as` swaps the rendered element in the row and in the overflow menu alike, and forwards
            `to` and `onNavigate` to it; the consumer, which owns the location, marks the current
            item. */}
        <TopNav aria-label="Mail">
          <TopNav.Item as={RouterLink} to="/inbox" onNavigate={setPath} current={path === "/inbox"}>
            Inbox
          </TopNav.Item>
          <TopNav.Item as={RouterLink} to="/sent" onNavigate={setPath} current={path === "/sent"}>
            Sent
          </TopNav.Item>
          <TopNav.Item as={RouterLink} to="/drafts" onNavigate={setPath} current={path === "/drafts"}>
            Drafts
          </TopNav.Item>
          <TopNav.Item as={RouterLink} to="/archive" onNavigate={setPath} current={path === "/archive"}>
            Archive
          </TopNav.Item>
          <TopNav.Item as={RouterLink} to="/spam" onNavigate={setPath} current={path === "/spam"}>
            Spam
          </TopNav.Item>
        </TopNav>
      </Frame>
    );
  },
};
