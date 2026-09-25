import {
  getPublishingPost,
  listPublishingPosts,
} from "@/lib/publishing/service";
import { ensureOperationalScope } from "../permissions";
import type { AssistantContext } from "../types";

export async function listScheduledPostsTool(ctx: AssistantContext) {
  ensureOperationalScope(ctx.scope);
  const posts = await listPublishingPosts(
    ctx.supabase,
    ctx.organizationId,
    ctx.scope
  );
  return posts.map((p) => ({
    id: p.id,
    platform: p.platform,
    status: p.status,
    caption: p.caption,
    scheduledFor: p.scheduledFor,
    publishedAt: p.publishedAt,
    accountName: p.accountName,
    accountUsername: p.accountUsername,
    errorMessage: p.errorMessage,
  }));
}

export async function getPostStatusTool(
  ctx: AssistantContext,
  args: { postId: string }
) {
  ensureOperationalScope(ctx.scope);
  if (!args.postId?.trim()) return { error: "postId is required." };
  const post = await getPublishingPost(
    ctx.supabase,
    ctx.organizationId,
    args.postId
  );
  if (!post) return { error: "Post not found." };
  return {
    id: post.id,
    platform: post.platform,
    status: post.status,
    caption: post.caption,
    scheduledFor: post.scheduledFor,
    publishedAt: post.publishedAt,
    accountName: post.accountName,
    errorMessage: post.errorMessage,
  };
}
