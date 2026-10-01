"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { AdtraxioLogo } from "@/components/brand/adtraxio-logo";
import { MARKETING_CTA } from "@/lib/design/marketing";
import { cn } from "@/lib/utils";

const navLinks = [
  { label: "Platform", href: "#platform" },
  { label: "Product", href: "#workspace" },
  { label: "Copilot", href: "#growth-copilot" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

const primaryCtaClass =
  "rounded-full bg-adtraxio-accent text-primary-foreground shadow-md hover:bg-adtraxio-accent/90";

export function Navbar() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (isHome) {
    return (
      <header className="pointer-events-none fixed inset-x-0 top-0 z-50 px-4 pt-4 sm:px-6 sm:pt-5">
        <nav
          className={cn(
            "pointer-events-auto mx-auto grid max-w-5xl grid-cols-[auto_1fr_auto] items-center gap-3 rounded-full border px-3 py-2 shadow-[0_8px_32px_rgba(0,0,0,0.35)] backdrop-blur-2xl transition-all duration-300 sm:grid-cols-[1fr_auto_1fr] sm:gap-4 sm:px-5 sm:py-2.5",
            "border-white/15 bg-black/45 supports-[backdrop-filter]:bg-black/35",
            scrolled && "border-white/20 bg-black/55 supports-[backdrop-filter]:bg-black/45"
          )}
          aria-label="Main"
        >
          <div className="justify-self-start sm:col-start-1">
            <AdtraxioLogo href="/" size="sm" priority />
          </div>

          <div className="hidden items-center justify-center gap-6 sm:col-start-2 sm:flex md:gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-white/85 transition-colors hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="col-start-3 flex items-center justify-end gap-2 sm:gap-3">
            <Link
              href="/login"
              className="hidden text-sm font-medium text-white/80 transition-colors hover:text-white sm:inline"
            >
              Log in
            </Link>
            <Button
              size="sm"
              className={cn(primaryCtaClass, "hidden h-9 px-5 sm:inline-flex")}
              asChild
            >
              <Link href={MARKETING_CTA.primaryHref}>{MARKETING_CTA.primary}</Link>
            </Button>

            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild className="sm:hidden">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Open menu"
                  className="text-white hover:bg-white/10"
                >
                  <Menu className="size-5" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="right"
                className="border-border bg-background w-full max-w-xs"
              >
                <SheetHeader>
                  <SheetTitle className="text-left">
                    <AdtraxioLogo href="/" size="sm" />
                  </SheetTitle>
                </SheetHeader>
                <div className="mt-8 flex flex-col gap-4">
                  {navLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setOpen(false)}
                      className="text-base text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  ))}
                  <div className="mt-4 flex flex-col gap-3 border-t border-border pt-6">
                    <Button variant="outline" size="cta" asChild>
                      <Link href="/login" onClick={() => setOpen(false)}>
                        Log in
                      </Link>
                    </Button>
                    <Button size="cta" className={primaryCtaClass} asChild>
                      <Link href="/signup" onClick={() => setOpen(false)}>
                        Start free
                      </Link>
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </nav>
      </header>
    );
  }

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        scrolled
          ? "border-b border-border bg-background/80 backdrop-blur-xl"
          : "bg-transparent"
      )}
    >
      <nav
        className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6 lg:h-14 lg:px-8"
        aria-label="Main"
      >
        <AdtraxioLogo href="/" size="sm" priority />

        <div className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <Button variant="ghost" size="cta" className="text-muted-foreground" asChild>
            <Link href="/login">Log in</Link>
          </Button>
          <Button size="cta" className={primaryCtaClass} asChild>
            <Link href={MARKETING_CTA.primaryHref}>{MARKETING_CTA.primary}</Link>
          </Button>
        </div>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon-sm" aria-label="Open menu">
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent
            side="right"
            className="border-border bg-background w-full max-w-xs"
          >
            <SheetHeader>
              <SheetTitle className="text-left">
                <AdtraxioLogo href="/" size="sm" />
              </SheetTitle>
            </SheetHeader>
            <div className="mt-8 flex flex-col gap-4">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="text-base text-muted-foreground transition-colors hover:text-foreground"
                >
                  {link.label}
                </Link>
              ))}
              <div className="mt-4 flex flex-col gap-3 border-t border-border pt-6">
                <Button variant="outline" size="cta" asChild>
                  <Link href="/login" onClick={() => setOpen(false)}>
                    Log in
                  </Link>
                </Button>
                <Button size="cta" className={primaryCtaClass} asChild>
                  <Link href="/signup" onClick={() => setOpen(false)}>
                    Start free
                  </Link>
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </nav>
    </header>
  );
}
