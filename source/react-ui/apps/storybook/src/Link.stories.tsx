import type { Meta, StoryObj } from "@storybook/react-vite";
import { Link } from "@vipengele/react-ui";
import type { AnchorHTMLAttributes } from "react";

/**
 * Stands in for a router's own link component: it accepts a `to` prop instead of `href` and
 * forwards every other prop, unchanged, to the `<a>` it renders. `Link`'s `as` prop composes
 * with anything shaped like this, not just `<a>` itself.
 */
function StubRouterLink({ to, children, ...rest }: { to: string } & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href">) {
  return (
    <a href={to} {...rest}>
      {children}
    </a>
  );
}

const meta = {
  title: "Components/Link",
  component: Link,
  args: { children: "Visit the documentation", href: "#" },
} satisfies Meta<typeof Link>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Tones: Story = {
  render: () => (
    <div style={{ display: "flex", gap: "1.5rem", alignItems: "center", flexWrap: "wrap" }}>
      {(["accent", "danger"] as const).map((tone) => (
        <Link key={tone} tone={tone} href="#">
          {tone} link
        </Link>
      ))}
    </div>
  ),
};

export const External: Story = {
  args: { href: "https://example.com", external: true, children: "Read the source" },
};

export const ComposedWithForeignAs: Story = {
  render: () => (
    <Link as={StubRouterLink} to="/settings">
      Go to settings
    </Link>
  ),
};

export const ExternalComposedWithForeignAs: Story = {
  render: () => (
    <Link as={StubRouterLink} to="https://example.com/changelog" external>
      View the changelog
    </Link>
  ),
};
