import { getCompactBrandPrompt, loadBrandBrainContext } from "../brand-brain/loader";
import { createPendingAction } from "../confirmations";
import type { AssistantContext } from "../types";

export async function preparePublishPost(
  ctx: AssistantContext,
  args: {
    postId?: string;
    contentId?: string;
    socialAccountId: string;
    caption?: string;
    mediaUrl?: string;
    conversationId: string;
  }
) {
  const summary = `Publish to connected account (${args.socialAccountId})${
    args.caption ? `: "${args.caption.slice(0, 80)}..."` : ""
  }`;
  return createPendingAction(ctx, {
    conversationId: args.conversationId,
    actionType: "publish_post",
    payload: {
      postId: args.postId,
      contentId: args.contentId,
      socialAccountId: args.socialAccountId,
      caption: args.caption,
      mediaUrl: args.mediaUrl,
    },
    summary,
  });
}

export async function prepareSchedulePost(
  ctx: AssistantContext,
  args: {
    contentId?: string;
    socialAccountId: string;
    caption?: string;
    mediaUrl?: string;
    scheduledFor: string;
    timezone?: string;
    conversationId: string;
  }
) {
  const summary = `Schedule post for ${args.scheduledFor} on account ${args.socialAccountId}`;
  return createPendingAction(ctx, {
    conversationId: args.conversationId,
    actionType: "schedule_post",
    payload: args,
    summary,
  });
}

export async function prepareCancelPost(
  ctx: AssistantContext,
  args: { postId: string; conversationId: string }
) {
  return createPendingAction(ctx, {
    conversationId: args.conversationId,
    actionType: "cancel_post",
    payload: { postId: args.postId },
    summary: `Cancel scheduled post ${args.postId}`,
  });
}

export async function prepareCreateCampaign(
  ctx: AssistantContext,
  args: {
    name: string;
    objective?: string;
    description?: string;
    startDate?: string;
    endDate?: string;
    conversationId: string;
  }
) {
  return createPendingAction(ctx, {
    conversationId: args.conversationId,
    actionType: "create_campaign",
    payload: {
      name: args.name,
      objective: args.objective,
      description: args.description,
      startDate: args.startDate,
      endDate: args.endDate,
    },
    summary: `Create campaign "${args.name}"`,
  });
}

export async function generateCampaignIdeaTool(
  ctx: AssistantContext,
  args: {
    objective?: string;
    audience?: string;
    platform?: string;
    topic?: string;
    duration?: string;
  }
) {
  const brain = await loadBrandBrainContext(ctx, { mode: "strategy" });
  const brandContext = await getCompactBrandPrompt(ctx, { mode: "strategy" });
  const profile = brain.profile;
  const pillars = profile?.contentPillars?.slice(0, 3) ?? [];
  const platforms = profile?.preferredPlatforms ?? [];
  const defaultPlatform =
    platforms[0] ?? args.platform ?? "instagram";

  const businessLabel =
    profile?.businessName?.trim() || "your brand";
  const topic =
    args.topic ??
    (pillars[0] ? `${pillars[0]} for ${businessLabel}` : businessLabel);

  return {
    concept: `Campaign focused on ${topic}`,
    objective:
      args.objective ??
      (profile?.goals?.[0] ? String(profile.goals[0]) : "brand awareness"),
    audience: args.audience ?? profile?.targetAudience ?? "your target audience",
    platform: args.platform ?? defaultPlatform,
    duration: args.duration ?? "2 weeks",
    approvedBrandContext:
      brandContext && !brandContext.startsWith("No approved")
        ? brandContext
        : undefined,
    contentPlan: [
      "Week 1: Introduce the theme with 2 educational posts",
      "Week 2: Share customer stories and social proof",
      "Week 3: Drive conversion with a clear CTA post",
    ],
    suggestedCadence: "3 posts per week",
    creativeDirections: [
      "Authentic, behind-the-scenes content",
      "Short-form video with captions",
      "Carousel posts with actionable tips",
    ],
    cta: "Learn more / Shop now",
    note:
      "This is a campaign concept draft. Confirm before creating a real campaign.",
  };
}
