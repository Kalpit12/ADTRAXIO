import Link from "next/link";
import { AdtraxioLogo } from "@/components/brand/adtraxio-logo";
import { APP_TAGLINE } from "@/lib/brand";

const footerLinks = {
  Product: [
    { label: "AI Studio", href: "#ai-studio" },
    { label: "Campaigns", href: "#campaigns" },
    { label: "Analytics", href: "#analytics" },
    { label: "Pricing", href: "#pricing" },
  ],
  Resources: [
    { label: "Help", href: "#" },
    { label: "Blog", href: "#" },
  ],
  Company: [
    { label: "About", href: "#" },
    { label: "Contact", href: "#" },
    { label: "Privacy", href: "#" },
    { label: "Terms", href: "#" },
  ],
};

export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto max-w-6xl px-6 py-16 lg:px-8">
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <AdtraxioLogo size="sm" />
            <p className="mt-3 text-sm text-muted-foreground">{APP_TAGLINE}.</p>
          </div>
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {category}
              </p>
              <ul className="mt-4 space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-foreground/70 transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-16 border-t border-border pt-8">
          <p className="text-xs text-muted-foreground">
            © 2026 ADTRAXIO. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
