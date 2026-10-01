import type { SubscriptionInfo } from "./types";

const STATUS_LABELS: Record<SubscriptionInfo["status"], string> = {
  free: "Free",
  active: "Active",
  trialing: "Trial",
  past_due: "Past due",
  canceled: "Canceled",
  unpaid: "Unpaid",
  incomplete: "Incomplete",
  incomplete_expired: "Incomplete",
  paused: "Paused",
};

export function subscriptionStatusLabel(
  status: SubscriptionInfo["status"]
): string {
  return STATUS_LABELS[status] ?? "Unknown";
}

export function subscriptionStatusHint(
  subscription: SubscriptionInfo
): string | null {
  if (subscription.status === "free" && !subscription.hasStripeSubscription) {
    return "You are on the Free plan. Upgrade anytime when you need more capacity.";
  }
  if (subscription.cancelAtPeriodEnd && subscription.currentPeriodEnd) {
    return "Your paid plan stays active until the end of the current billing period, then returns to Free.";
  }
  if (subscription.status === "past_due") {
    return "We could not process your last payment. Update your payment method in billing management.";
  }
  if (subscription.status === "canceled") {
    return "This subscription is canceled. You may still have access until the period ends.";
  }
  if (subscription.status === "trialing" && subscription.trialEnd) {
    return "You are in a trial period. Billing begins when the trial ends unless you cancel.";
  }
  if (
    subscription.status === "incomplete" ||
    subscription.status === "incomplete_expired"
  ) {
    return "Checkout did not finish. Try upgrading again or open billing management.";
  }
  if (subscription.status === "active" && subscription.hasStripeSubscription) {
    return "Your subscription renews automatically each month unless you change or cancel it.";
  }
  return null;
}

export function planDisplayName(planId: string): string {
  if (planId === "free") return "Free";
  if (planId === "pro") return "Pro";
  if (planId === "agency") return "Agency";
  return planId.charAt(0).toUpperCase() + planId.slice(1);
}

export function friendlyBillingError(
  message: string | null | undefined
): string {
  if (!message) return "Something went wrong. Try again.";
  const lower = message.toLowerCase();
  if (
    lower.includes("stripe") ||
    lower.includes("price_") ||
    lower.includes("cus_") ||
    lower.includes("sub_") ||
    lower.includes("webhook") ||
    lower.includes("supabase") ||
    lower.includes("environment") ||
    lower.includes("env") ||
    message.length > 160
  ) {
    return "Something went wrong. Try again.";
  }
  return message;
}

export function statusTone(
  status: SubscriptionInfo["status"]
): "neutral" | "positive" | "warning" | "negative" {
  if (status === "free") return "neutral";
  if (status === "active" || status === "trialing") return "positive";
  if (status === "past_due" || status === "incomplete") return "warning";
  if (
    status === "canceled" ||
    status === "unpaid" ||
    status === "incomplete_expired"
  ) {
    return "negative";
  }
  return "neutral";
}
