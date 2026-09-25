import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function BillingCancelPage() {
  return (
    <div className="mx-auto max-w-lg space-y-6 py-10">
      <header>
        <h1 className="font-heading text-3xl tracking-tight text-foreground">
          Checkout canceled
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          No changes were made to your subscription.
        </p>
      </header>
      <Button asChild size="sm" variant="outline">
        <Link href="/billing">Return to billing</Link>
      </Button>
    </div>
  );
}
