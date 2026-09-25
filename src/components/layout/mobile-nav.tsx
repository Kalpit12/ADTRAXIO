"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  AI_NAV,
  FOOTER_NAV,
  MAIN_NAV,
  SECONDARY_NAV,
  type NavItem,
} from "@/lib/navigation/app-nav";
import { AdtraxioLogo } from "@/components/brand/adtraxio-logo";
import { cn } from "@/lib/utils";

const MOBILE_PRIMARY: NavItem[] = [
  MAIN_NAV[0],
  MAIN_NAV[1],
  MAIN_NAV[3],
  MAIN_NAV[4],
  SECONDARY_NAV[0],
];

function MobileNavLink({
  item,
  active,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  onNavigate: () => void;
}) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
        active
          ? "bg-secondary font-medium text-foreground"
          : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground"
      )}
    >
      <Icon
        className={cn(
          "size-[18px] shrink-0",
          active ? "text-foreground" : "text-muted-foreground"
        )}
      />
      {item.label}
    </Link>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-sidebar/95 backdrop-blur-xl lg:hidden">
      <div className="mx-auto flex max-w-lg items-stretch justify-around px-1 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-1">
        {MOBILE_PRIMARY.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-w-0 flex-1 flex-col items-center gap-1 px-1 py-2 text-[10px] font-medium transition-colors",
                active ? "text-foreground" : "text-muted-foreground"
              )}
            >
              <Icon className="size-5" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <button
              type="button"
              className="flex min-w-0 flex-1 flex-col items-center gap-1 px-1 py-2 text-[10px] font-medium text-muted-foreground"
            >
              <Menu className="size-5" />
              <span>More</span>
            </button>
          </SheetTrigger>
          <SheetContent
            side="left"
            className="w-[280px] border-border bg-sidebar"
          >
            <SheetHeader>
              <SheetTitle className="text-left">
                <AdtraxioLogo href="/dashboard" size="xs" />
              </SheetTitle>
            </SheetHeader>
            <div className="mt-6 space-y-6 overflow-y-auto pb-8">
              <div className="space-y-1">
                {MAIN_NAV.map((item) => (
                  <MobileNavLink
                    key={item.href}
                    item={item}
                    active={isActive(item.href)}
                    onNavigate={() => setOpen(false)}
                  />
                ))}
              </div>
              <div className="h-px bg-border/80" />
              <div className="space-y-1">
                {SECONDARY_NAV.map((item) => (
                  <MobileNavLink
                    key={item.href}
                    item={item}
                    active={isActive(item.href)}
                    onNavigate={() => setOpen(false)}
                  />
                ))}
              </div>
              <div className="h-px bg-border/80" />
              <div className="space-y-1">
                {AI_NAV.map((item) => (
                  <MobileNavLink
                    key={item.href}
                    item={item}
                    active={isActive(item.href)}
                    onNavigate={() => setOpen(false)}
                  />
                ))}
              </div>
              <div className="h-px bg-border/80" />
              <div className="space-y-1">
                {FOOTER_NAV.map((item) => (
                  <MobileNavLink
                    key={item.href}
                    item={item}
                    active={isActive(item.href)}
                    onNavigate={() => setOpen(false)}
                  />
                ))}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
