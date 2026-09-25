import {
  BarChart3,
  Bot,
  Calendar,
  CreditCard,
  FileText,
  LayoutDashboard,
  Megaphone,
  MessageSquare,
  Settings,
  Share2,
  PenLine,
  Send,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export const MAIN_NAV: NavItem[] = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { label: "Create", href: "/create", icon: PenLine },
  { label: "Campaigns", href: "/campaigns", icon: Megaphone },
  { label: "Calendar", href: "/calendar", icon: Calendar },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  { label: "Growth Intelligence", href: "/intelligence", icon: TrendingUp },
];

export const SECONDARY_NAV: NavItem[] = [
  { label: "Publishing", href: "/publishing", icon: Send },
  { label: "Social", href: "/social", icon: Share2 },
  { label: "Clients", href: "/clients", icon: Users },
  { label: "Reports", href: "/reports", icon: FileText },
  { label: "Messages", href: "/messages", icon: MessageSquare },
];

export const AI_NAV: NavItem[] = [
  { label: "Assistant", href: "/assistant", icon: Bot },
];

export const FOOTER_NAV: NavItem[] = [
  { label: "Settings", href: "/settings", icon: Settings },
  { label: "Billing", href: "/billing", icon: CreditCard },
];

export const WORKSPACE_ROUTES = [
  "/dashboard",
  "/create",
  "/calendar",
  "/campaigns",
  "/analytics",
  "/intelligence",
  "/publishing",
  "/social",
  "/clients",
  "/reports",
  "/messages",
  "/notifications",
  "/assistant",
  "/ai",
  "/settings",
  "/billing",
] as const;

export function isWorkspaceRoute(pathname: string) {
  return WORKSPACE_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}
