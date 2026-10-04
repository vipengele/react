import type { Meta, StoryObj } from "@storybook/react-vite";
import { Breadcrumbs } from "@vipengele/react-ui";
import type { AnchorHTMLAttributes } from "react";

/**
 * Stands in for a router's own link component: it navigates by `to` and forwards every other
 * prop, unchanged, to the `<a>` it renders. `Breadcrumbs`' `linkAs` composes with anything shaped
 * like this, not just `<a>` itself.
 */
function StubRouterLink({ to, href: _href, children, ...rest }: { to: string } & AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a href={to} {...rest}>
      {children}
    </a>
  );
}

const shortTrail = [{ label: "Home", href: "#" }, { label: "Projects", href: "#" }, { label: "Vipengele" }];

const deepTrail = [
  { label: "Home", href: "#" },
  { label: "Projects", href: "#" },
  { label: "Vipengele", href: "#" },
  { label: "Packages", href: "#" },
  { label: "UI", href: "#" },
  { label: "Components", href: "#" },
  { label: "Breadcrumbs" },
];

const meta = {
  title: "Components/Breadcrumbs",
  component: Breadcrumbs,
  args: { items: shortTrail },
} satisfies Meta<typeof Breadcrumbs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Collapsed: Story = {
  args: { items: deepTrail },
};

export const CustomCounts: Story = {
  args: { items: deepTrail, maxItems: 5, itemsBeforeCollapse: 2, itemsAfterCollapse: 3 },
};

export const ComposedWithForeignAs: Story = {
  render: () => (
    <Breadcrumbs
      linkAs={StubRouterLink}
      items={[
        { label: "Home", href: "/", linkProps: { to: "/" } },
        { label: "Settings", href: "/settings", linkProps: { to: "/settings" } },
        { label: "Profile" },
      ]}
    />
  ),
};

export const SingleItem: Story = {
  args: { items: [{ label: "Home" }] },
};
