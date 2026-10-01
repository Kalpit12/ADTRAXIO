import { Button } from "@/components/ui/button";

interface BillingActionPanelProps {
  portalLoading: boolean;
  checkoutBusy: boolean;
  onManageBilling: () => void;
}

export function BillingActionPanel({
  portalLoading,
  checkoutBusy,
  onManageBilling,
}: BillingActionPanelProps) {
  return (
    <div className="rounded-md border border-border/60 px-4 py-4 sm:px-5">
      <p className="text-sm text-muted-foreground">
        Update payment method, view invoices, or change your subscription in our
        secure billing portal. Changes apply after your payment provider confirms
        them.
      </p>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="mt-4"
        disabled={portalLoading || checkoutBusy}
        onClick={onManageBilling}
      >
        {portalLoading ? "Opening billing portal…" : "Manage billing"}
      </Button>
    </div>
  );
}
