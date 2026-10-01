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
import { AdtraxioLogo } from "@/components/brand/adtraxio-logo";
import { AppCommandEntry } from "@/components/layout/app-command-entry";
import { ShellNavSection } from "@/components/layout/sidebar-nav";
import { WorkspaceSwitcher } from "@/components/layout/workspace-switcher";
import { useShellNavigation } from "@/lib/navigation/use-shell-navigation";
import { isNavItemActive } from "@/lib/navigation/is-nav-active";
import { MAIN_NAV, SECONDARY_NAV } from "@/lib/navigation/app-nav";
import { cn } from "@/lib/utils";

const MOBILE_PRIMARY = [
  MAIN_NAV[0],
  MAIN_NAV[1],
  { ...MAIN_NAV[4], label: "Analytics" },
  SECONDARY_NAV[0],
];

export function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { sections } = useShellNavigation();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-sidebar/95 backdrop-blur-md lg:hidden"
      aria-label="Mobile navigation"
    >
      <div className="mx-auto flex max-w-lg items-stretch justify-around px-1 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-1">
        {MOBILE_PRIMARY.map((item) => {
          const Icon = item.icon;
          const active = isNavItemActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-h-[44px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-[10px] font-medium transition-colors",
                active ? "text-foreground" : "text-muted-foreground"
              )}
            >
              <Icon className="size-5" strokeWidth={1.5} />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <button
              type="button"
              className="flex min-h-[44px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-[10px] font-medium text-muted-foreground"
            >
              <Menu className="size-5" />
              <span>More</span>
            </button>
          </SheetTrigger>
          <SheetContent
            side="left"
            className="w-[min(100vw-2rem,300px)] border-border bg-sidebar p-0"
          >
            <SheetHeader className="border-b border-border/60 px-4 py-4 text-left">
              <SheetTitle className="text-left">
                <AdtraxioLogo href="/dashboard" size="sm" />
              </SheetTitle>
              <WorkspaceSwitcher className="mt-3 w-full" />
              <AppCommandEntry className="mt-3 w-full" />
            </SheetHeader>
            <div className="space-y-5 overflow-y-auto px-2 py-4 pb-10">
              {sections.map((section) => (
                <ShellNavSection
                  key={section.id}
                  label={section.label}
                  items={section.items}
                  onNavigate={() => setOpen(false)}
                />
              ))}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
