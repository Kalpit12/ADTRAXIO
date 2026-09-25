import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "./stripe";
import {
  markSubscriptionCanceled,
  upsertSubscriptionFromStripe,
} from "./service";

export async function verifyStripeWebhook(
  payload: string,
  signature: string | null
): Promise<Stripe.Event> {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret) {
    throw new Error("Webhook secret is not configured.");
  }
  if (!signature) {
    throw new Error("Missing Stripe signature.");
  }

  const stripe = getStripe();
  return stripe.webhooks.constructEvent(payload, signature, secret);
}

export async function isEventProcessed(eventId: string): Promise<boolean> {
  const admin = createAdminClient();
  if (!admin) return false;

  const { data } = await admin
    .from("billing_events")
    .select("id")
    .eq("stripe_event_id", eventId)
    .maybeSingle();

  return Boolean(data);
}

export async function markEventProcessed(
  eventId: string,
  eventType: string
): Promise<void> {
  const admin = createAdminClient();
  if (!admin) throw new Error("Admin client unavailable.");

  const { error } = await admin.from("billing_events").insert({
    stripe_event_id: eventId,
    event_type: eventType,
  });

  if (error && error.code !== "23505") {
    throw new Error(error.message);
  }
}

async function resolveOrganizationId(
  subscription: Stripe.Subscription
): Promise<string | null> {
  if (subscription.metadata?.organization_id) {
    return subscription.metadata.organization_id;
  }

  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer?.id;

  if (!customerId) return null;

  const admin = createAdminClient();
  if (!admin) return null;

  const { data } = await admin
    .from("billing_customers")
    .select("organization_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  return (data?.organization_id as string) ?? null;
}

export async function handleStripeEvent(event: Stripe.Event): Promise<void> {
  const alreadyProcessed = await isEventProcessed(event.id);
  if (alreadyProcessed) return;

  const stripe = getStripe();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const organizationId = session.metadata?.organization_id;
      const subscriptionId = session.subscription;

      if (organizationId && subscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(
          typeof subscriptionId === "string" ? subscriptionId : subscriptionId.id
        );
        await upsertSubscriptionFromStripe(organizationId, subscription);
      }
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const organizationId = await resolveOrganizationId(subscription);
      if (organizationId) {
        await upsertSubscriptionFromStripe(organizationId, subscription);
      }
      break;
    }
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const organizationId = await resolveOrganizationId(subscription);
      if (organizationId) {
        await markSubscriptionCanceled(organizationId);
      }
      break;
    }
    case "invoice.payment_failed":
    case "invoice.paid": {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionRef =
        invoice.parent?.subscription_details?.subscription ?? null;
      if (subscriptionRef) {
        const subscriptionId =
          typeof subscriptionRef === "string"
            ? subscriptionRef
            : subscriptionRef.id;
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const organizationId = await resolveOrganizationId(subscription);
        if (organizationId) {
          await upsertSubscriptionFromStripe(organizationId, subscription);
        }
      }
      break;
    }
    default:
      break;
  }

  await markEventProcessed(event.id, event.type);
}
