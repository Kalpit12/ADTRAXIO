import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";

export default function BillingCancelPage() {
  return (
    <div className="mx-auto max-w-lg space-y-8 py-4">
      <PageHeader
        eyebrow="Billing"
        title="Checkout canceled"
        description="No changes were made to your subscription."
      />
      <Button asChild size="sm" variant="outline">
        <Link href="/billing">Return to billing</Link>
      </Button>
    </div>
  );
}
