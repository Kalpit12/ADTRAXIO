"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import type { NavItem } from "@/lib/navigation/app-nav";
import { isNavItemActive } from "@/lib/navigation/is-nav-active";
import { cn } from "@/lib/utils";

export function ShellNavLink({
  item,
  collapsed = false,
  onNavigate,
}: {
  item: NavItem;
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const active = isNavItemActive(pathname, item.href);
  const reduceMotion = useReducedMotion();
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      title={collapsed ? item.label : undefined}
      className={cn(
        "group relative flex items-center gap-3 rounded-md px-3 py-2 text-[13px] transition-colors duration-150",
        collapsed && "justify-center px-2",
        active
          ? "bg-white/[0.04] font-medium text-foreground"
          : "text-muted-foreground hover:bg-white/[0.03] hover:text-foreground"
      )}
    >
      {active && !reduceMotion && (
        <motion.span
          layoutId="shell-nav-active"
          className="absolute inset-y-1 left-0 w-0.5 rounded-full bg-adtraxio-accent"
          transition={{ type: "spring", stiffness: 400, damping: 34 }}
        />
      )}
      {active && reduceMotion && (
        <span
          className="absolute inset-y-1 left-0 w-0.5 rounded-full bg-adtraxio-accent"
          aria-hidden
        />
      )}
      <Icon
        className={cn(
          "size-[17px] shrink-0",
          active ? "text-foreground" : "text-muted-foreground/90"
        )}
        strokeWidth={1.5}
      />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  );
}

export function ShellNavSection({
  label,
  items,
  collapsed = false,
  onNavigate,
}: {
  label: string;
  items: NavItem[];
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  if (items.length === 0) return null;

  return (
    <div className="space-y-0.5">
      {!collapsed && (
        <p className="mb-2 px-3 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground/65">
          {label}
        </p>
      )}
      {collapsed && (
        <div className="mb-2 h-px bg-border/60" aria-hidden />
      )}
      {items.map((item) => (
        <ShellNavLink
          key={item.href}
          item={item}
          collapsed={collapsed}
          onNavigate={onNavigate}
        />
      ))}
    </div>
  );
}
