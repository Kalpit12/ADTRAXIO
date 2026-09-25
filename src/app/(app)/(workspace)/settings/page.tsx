import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Settings — ADTRAXIO",
};

export default function SettingsPage() {
  return (
    <div className="space-y-10">
      <header className="border-b border-border/60 pb-6">
        <p className="text-xs font-medium text-muted-foreground">Settings</p>
        <h1 className="font-heading mt-1 text-3xl tracking-tight text-foreground sm:text-4xl">
          Workspace settings
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Manage your workspace preferences and subscription.
        </p>
      </header>

      <section className="rounded-lg border border-border/60 p-5">
        <h2 className="text-sm font-medium text-foreground">Billing</h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          View your plan, usage, and manage your subscription through Stripe.
        </p>
        <Button asChild size="sm" variant="outline" className="mt-4">
          <Link href="/billing">Manage billing</Link>
        </Button>
      </section>
    </div>
  );
}
