import { AssistantPermissionError } from "../permissions";
import type { AssistantContext, ToolDefinition, ToolRiskLevel } from "../types";
import {
  getAnalyticsOverviewTool,
  getContentPerformanceTool,
  getTopContentTool,
} from "./analytics";
import {
  generateCampaignIdeaTool,
  prepareCancelPost,
  prepareCreateCampaign,
  preparePublishPost,
  prepareSchedulePost,
} from "./actions";
import {
  getCampaignPerformanceTool,
  getCampaignTool,
  listCampaignsTool,
} from "./campaigns";
import { getCampaignContextTool } from "./campaign-context";
import {
  generateContentLikeTool,
  generateContentTool,
  getContentTool,
  listContentTool,
  repurposeContentTool,
  saveGeneratedContentDraftTool,
  searchContentTool,
} from "./content";
import {
  getReportContextTool,
  getReportSnapshotTool,
} from "./reports-context";
import {
  getBrandContextTool,
  getBrandProductTool,
  proposeLearnedPatternsTool,
  proposeSaveBrandMemoryTool,
} from "./brand-brain";
import {
  createContentFromPlanTool,
  createStrategyPlanTool,
  getStrategyPlanTool,
  updateStrategyPlanTool,
} from "./strategy";
import {
  getIntelligenceOverviewTool,
  getRecommendationsTool,
} from "./intelligence";
import { getPostStatusTool, listScheduledPostsTool } from "./publishing";
import { getReportTool, listReportsTool } from "./reports";
import { listConnectedAccountsTool } from "./social";
import { getWorkspaceContextTool } from "./workspace";
import { createExecutionPlanTool } from "./execution";
import { createStrategicPlanTool } from "./strategic-planner";
import {
  explainExecutionOutcomeTool,
  getLearningOutcomesTool,
  getLearningSummaryTool,
} from "./learning";
import { getStrategyEvaluationTool } from "./evaluation";
import {
  compareExperimentVariantsTool,
  createExperimentDraftTool,
  getExperimentConflictsTool,
  getExperimentHistoryTool,
  getExperimentIntelligenceTool,
  getExperimentTool,
  getExperimentsTool,
  getRelatedExperimentsTool,
  getHistoricalExperimentEvidenceTool,
  getExperimentEvaluationTool,
  prepareExperimentTool,
} from "./experiments";
import {
  getCrossExperimentEvidenceTool,
  getCrossExperimentLearningsTool,
  getEvidenceConflictsTool,
  getEvidenceRelationshipsTool,
} from "./evidence";
import {
  getOptimizationEligibilityTool,
  getOptimizationOutcomeTool,
  getOptimizationOutcomesTool,
  getOptimizationProposalsTool,
  prepareOptimizationProposalTool,
  previewOptimizationTool,
  executeOptimizationTool,
  rollbackOptimizationTool,
} from "./optimization";

type ToolHandler = (
  ctx: AssistantContext,
  args: Record<string, unknown>,
  meta?: { conversationId: string }
) => Promise<unknown>;

const TOOL_STATUS_LABELS: Record<string, string> = {
  get_analytics_overview: "Analyzing your analytics...",
  get_top_content: "Finding top-performing content...",
  get_content_performance: "Checking content performance...",
  list_campaigns: "Loading campaigns...",
  get_campaign: "Loading campaign details...",
  get_campaign_performance: "Analyzing campaign performance...",
  list_content: "Loading content...",
  get_content: "Loading content details...",
  search_content: "Searching content...",
  generate_content: "Drafting content...",
  list_scheduled_posts: "Checking scheduled posts...",
  get_post_status: "Checking post status...",
  list_connected_accounts: "Loading connected accounts...",
  get_recommendations: "Loading recommendations...",
  get_intelligence_overview: "Loading growth intelligence...",
  list_reports: "Loading reports...",
  get_report: "Loading report...",
  get_report_context: "Loading report analysis...",
  get_report_snapshot: "Loading report snapshot...",
  get_campaign_context: "Loading campaign context...",
  repurpose_content: "Repurposing content...",
  generate_content_like: "Creating content from reference...",
  save_generated_content_draft: "Saving content draft...",
  create_strategy_plan: "Building strategy plan...",
  get_strategy_plan: "Loading strategy plan...",
  update_strategy_plan: "Updating strategy plan...",
  create_content_from_plan: "Creating drafts from plan...",
  get_brand_context: "Loading Brand Brain...",
  get_brand_product: "Loading product...",
  propose_save_brand_memory: "Preparing preference save...",
  propose_learned_patterns: "Analyzing patterns...",
  get_workspace_context: "Loading workspace context...",
  generate_campaign_idea: "Developing campaign concept...",
  create_execution_plan: "Building execution plan...",
  create_strategic_plan: "Building strategic plan...",
  get_learning_outcomes: "Loading learning outcomes...",
  get_learning_summary: "Summarizing learnings...",
  explain_execution_outcome: "Explaining execution outcome...",
  get_strategy_evaluation: "Loading strategy evaluation...",
  get_experiments: "Loading experiments...",
  get_experiment: "Loading experiment...",
  compare_experiment_variants: "Comparing experiment variants...",
  create_experiment_draft: "Drafting experiment...",
  prepare_experiment: "Preparing experiment execution...",
  get_experiment_intelligence: "Loading experiment intelligence...",
  get_experiment_history: "Loading experiment history...",
  get_related_experiments: "Finding related experiments...",
  get_experiment_conflicts: "Checking experiment conflicts...",
  get_historical_experiment_evidence: "Aggregating historical experiment evidence...",
  get_experiment_evaluation: "Loading experiment evaluation...",
  get_cross_experiment_evidence: "Analyzing cross-experiment evidence...",
  get_cross_experiment_learnings: "Loading experiment-linked learnings...",
  get_evidence_relationships: "Loading evidence relationships...",
  get_evidence_conflicts: "Checking evidence conflicts...",
  get_optimization_outcome: "Loading optimization outcome...",
  get_optimization_outcomes: "Loading optimization outcomes...",
  get_optimization_proposals: "Loading optimization proposals...",
  get_optimization_eligibility: "Checking optimization eligibility...",
  preview_optimization: "Building optimization preview...",
  prepare_optimization_proposal: "Preparing optimization draft...",
  execute_optimization: "Preparing execution confirmation...",
  rollback_optimization: "Preparing rollback confirmation...",
};

export const ASSISTANT_TOOLS: ToolDefinition[] = [
  {
    name: "get_analytics_overview",
    description: "Get analytics overview for the workspace including impressions, reach, engagement, and platform breakdown.",
    risk: "read",
    parameters: {
      type: "object",
      properties: {
        dateRange: { type: "string", enum: ["7d", "30d", "90d"] },
        platform: { type: "string", enum: ["instagram", "facebook"] },
      },
    },
  },
  {
    name: "get_top_content",
    description: "Get top performing content by engagement.",
    risk: "read",
    parameters: {
      type: "object",
      properties: {
        dateRange: { type: "string", enum: ["7d", "30d", "90d"] },
        platform: { type: "string" },
        limit: { type: "number" },
      },
    },
  },
  {
    name: "get_content_performance",
    description: "Get performance metrics for a specific content item.",
    risk: "read",
    parameters: {
      type: "object",
      properties: { contentId: { type: "string" } },
      required: ["contentId"],
    },
  },
  {
    name: "list_campaigns",
    description: "List campaigns in the workspace.",
    risk: "read",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "get_campaign",
    description: "Get details for a specific campaign.",
    risk: "read",
    parameters: {
      type: "object",
      properties: { campaignId: { type: "string" } },
      required: ["campaignId"],
    },
  },
  {
    name: "get_campaign_performance",
    description: "Get performance metrics for a campaign.",
    risk: "read",
    parameters: {
      type: "object",
      properties: { campaignId: { type: "string" } },
      required: ["campaignId"],
    },
  },
  {
    name: "list_content",
    description: "List recent content drafts and posts.",
    risk: "read",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "get_content",
    description: "Get full details for a content item.",
    risk: "read",
    parameters: {
      type: "object",
      properties: { contentId: { type: "string" } },
      required: ["contentId"],
    },
  },
  {
    name: "search_content",
    description: "Search content by topic or headline.",
    risk: "read",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string" },
        limit: { type: "number" },
      },
      required: ["query"],
    },
  },
  {
    name: "generate_content",
    description: "Generate content draft using Content Studio. Does not publish.",
    risk: "write",
    parameters: {
      type: "object",
      properties: {
        contentType: { type: "string" },
        goal: { type: "string" },
        platform: { type: "string" },
        audience: { type: "string" },
        tone: { type: "string" },
        topic: { type: "string" },
        context: { type: "string" },
        cta: { type: "string" },
        productName: { type: "string" },
        productId: { type: "string" },
      },
      required: ["topic"],
    },
  },
  {
    name: "get_brand_context",
    description:
      "Load approved Brand Brain context (profile, voice, pillars, rules, memories, products summary).",
    risk: "read",
    parameters: {
      type: "object",
      properties: {
        mode: { type: "string", enum: ["full", "generation", "strategy"] },
        productId: { type: "string" },
        productName: { type: "string" },
      },
    },
  },
  {
    name: "get_brand_product",
    description:
      "Retrieve a product from Brand Brain by ID or name, including approved claims.",
    risk: "read",
    parameters: {
      type: "object",
      properties: {
        productId: { type: "string" },
        productName: { type: "string" },
      },
    },
  },
  {
    name: "propose_save_brand_memory",
    description:
      "Propose saving an explicit user preference to Brand Brain. Requires user confirmation before saving.",
    risk: "write",
    parameters: {
      type: "object",
      properties: {
        category: {
          type: "string",
          enum: ["preference", "brand", "audience", "strategy", "content", "product"],
        },
        key: { type: "string" },
        value: { type: "string" },
      },
      required: ["category", "key", "value"],
    },
  },
  {
    name: "propose_learned_patterns",
    description:
      "Analyze top content performance and propose learned patterns for user confirmation (not auto-saved).",
    risk: "read",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "list_scheduled_posts",
    description: "List scheduled and published posts.",
    risk: "read",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "get_post_status",
    description: "Get status of a specific scheduled or published post.",
    risk: "read",
    parameters: {
      type: "object",
      properties: { postId: { type: "string" } },
      required: ["postId"],
    },
  },
  {
    name: "list_connected_accounts",
    description: "List connected social accounts (no tokens).",
    risk: "read",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "get_recommendations",
    description: "Get ADTRAXIO growth recommendations.",
    risk: "read",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "get_intelligence_overview",
    description: "Get growth intelligence overview and insights.",
    risk: "read",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "list_reports",
    description: "List client reports.",
    risk: "read",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "get_report",
    description: "Get a specific report.",
    risk: "read",
    parameters: {
      type: "object",
      properties: { reportId: { type: "string" } },
      required: ["reportId"],
    },
  },
  {
    name: "get_report_context",
    description:
      "Get full report context including latest snapshot metrics, growth, platforms, top content, campaigns, recommendations, and executive summary.",
    risk: "read",
    parameters: {
      type: "object",
      properties: { reportId: { type: "string" } },
      required: ["reportId"],
    },
  },
  {
    name: "get_report_snapshot",
    description: "Get a specific or latest report snapshot data payload.",
    risk: "read",
    parameters: {
      type: "object",
      properties: {
        reportId: { type: "string" },
        snapshotId: { type: "string" },
      },
      required: ["reportId"],
    },
  },
  {
    name: "get_campaign_context",
    description:
      "Get deep campaign context: details, attached content/accounts, publishing results, performance, and related recommendations.",
    risk: "read",
    parameters: {
      type: "object",
      properties: { campaignId: { type: "string" } },
      required: ["campaignId"],
    },
  },
  {
    name: "repurpose_content",
    description:
      "Repurpose existing content for another platform or format. Does not publish.",
    risk: "write",
    parameters: {
      type: "object",
      properties: {
        contentId: { type: "string" },
        targetPlatform: { type: "string" },
        format: { type: "string" },
      },
      required: ["contentId", "targetPlatform"],
    },
  },
  {
    name: "generate_content_like",
    description:
      "Generate new content based on an existing high-performing content item.",
    risk: "write",
    parameters: {
      type: "object",
      properties: {
        contentId: { type: "string" },
        topic: { type: "string" },
        variationCount: { type: "number" },
      },
      required: ["contentId"],
    },
  },
  {
    name: "save_generated_content_draft",
    description: "Save a generated brief/creative as a content draft in Content Studio.",
    risk: "write",
    parameters: {
      type: "object",
      properties: {
        brief: { type: "object" },
        creative: { type: "object" },
      },
      required: ["brief", "creative"],
    },
  },
  {
    name: "create_strategy_plan",
    description:
      "Create a draft strategy plan using real workspace performance data. Does not publish content.",
    risk: "write",
    parameters: {
      type: "object",
      properties: {
        objective: { type: "string" },
        durationDays: { type: "number" },
        platforms: { type: "array", items: { type: "string" } },
        audience: { type: "string" },
        focus: { type: "string" },
      },
      required: ["objective"],
    },
  },
  {
    name: "get_strategy_plan",
    description: "Get a strategy plan by ID.",
    risk: "read",
    parameters: {
      type: "object",
      properties: { planId: { type: "string" } },
      required: ["planId"],
    },
  },
  {
    name: "update_strategy_plan",
    description: "Update a draft strategy plan.",
    risk: "write",
    parameters: {
      type: "object",
      properties: {
        planId: { type: "string" },
        title: { type: "string" },
        objective: { type: "string" },
        audience: { type: "string" },
        platforms: { type: "array", items: { type: "string" } },
        cadence: { type: "string" },
        durationDays: { type: "number" },
        contentPillars: { type: "array" },
        planJson: { type: "object" },
        status: { type: "string", enum: ["draft", "active", "archived"] },
      },
      required: ["planId"],
    },
  },
  {
    name: "create_content_from_plan",
    description:
      "Generate and save content drafts from items in a strategy plan. Does not publish.",
    risk: "write",
    parameters: {
      type: "object",
      properties: {
        planId: { type: "string" },
        count: { type: "number" },
        ideaIndices: { type: "array", items: { type: "number" } },
      },
      required: ["planId"],
    },
  },
  {
    name: "get_workspace_context",
    description: "Get workspace type, plan, and connected platforms.",
    risk: "read",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "generate_campaign_idea",
    description: "Generate a campaign concept draft. Does not create a campaign.",
    risk: "read",
    parameters: {
      type: "object",
      properties: {
        objective: { type: "string" },
        audience: { type: "string" },
        platform: { type: "string" },
        topic: { type: "string" },
        duration: { type: "string" },
      },
    },
  },
  {
    name: "create_execution_plan",
    description:
      "Create a draft execution plan from an objective and optional growth brief. Set prepare=true to generate drafts and open review. Never publishes automatically.",
    risk: "write",
    parameters: {
      type: "object",
      properties: {
        objective: { type: "string" },
        growthBriefId: { type: "string" },
        sourceRecommendationIndex: { type: "number" },
        instructions: { type: "string" },
        prepare: { type: "boolean" },
      },
      required: ["objective"],
    },
  },
  {
    name: "get_learning_outcomes",
    description: "List AI learning outcomes for this workspace (read-only).",
    risk: "read",
    parameters: {
      type: "object",
      properties: {
        limit: { type: "number" },
        status: {
          type: "string",
          enum: ["pending", "measuring", "measured", "insufficient_data", "failed"],
        },
      },
    },
  },
  {
    name: "get_learning_summary",
    description: "Summarize validated historical learnings for strategy (read-only).",
    risk: "read",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "explain_execution_outcome",
    description:
      "Explain what happened after an execution plan or learning outcome (read-only).",
    risk: "read",
    parameters: {
      type: "object",
      properties: {
        executionPlanId: { type: "string" },
        outcomeId: { type: "string" },
      },
    },
  },
  {
    name: "get_strategy_evaluation",
    description:
      "Read how a past strategy performed vs its objective (evaluation, not execution). Read-only.",
    risk: "read",
    parameters: {
      type: "object",
      properties: {
        evaluationId: { type: "string" },
        strategicPlanId: { type: "string" },
        limit: { type: "number" },
      },
    },
  },
  {
    name: "get_experiments",
    description: "List controlled experiments in this workspace (read-only).",
    risk: "read",
    parameters: {
      type: "object",
      properties: {
        limit: { type: "number" },
        status: {
          type: "string",
          enum: ["draft", "review", "approved", "running", "paused", "completed", "cancelled"],
        },
      },
    },
  },
  {
    name: "get_experiment",
    description: "Get one experiment with variants (read-only).",
    risk: "read",
    parameters: {
      type: "object",
      properties: { experimentId: { type: "string" } },
      required: ["experimentId"],
    },
  },
  {
    name: "compare_experiment_variants",
    description: "Compare observed variant results (deterministic, read-only).",
    risk: "read",
    parameters: {
      type: "object",
      properties: { experimentId: { type: "string" } },
      required: ["experimentId"],
    },
  },
  {
    name: "create_experiment_draft",
    description:
      "Propose a controlled A/B experiment draft. Does not start, publish, or allocate traffic.",
    risk: "write",
    parameters: {
      type: "object",
      properties: {
        request: { type: "string" },
        platform: { type: "string" },
      },
      required: ["request"],
    },
  },
  {
    name: "prepare_experiment",
    description:
      "Prepare execution plan for an approved experiment. Requires user approval before any publish.",
    risk: "write",
    parameters: {
      type: "object",
      properties: { experimentId: { type: "string" } },
      required: ["experimentId"],
    },
  },
  {
    name: "get_experiment_intelligence",
    description: "Read experiment health, evidence quality, and summary (read-only).",
    risk: "read",
    parameters: {
      type: "object",
      properties: { experimentId: { type: "string" } },
      required: ["experimentId"],
    },
  },
  {
    name: "get_experiment_history",
    description: "List completed experiment history for this workspace (read-only).",
    risk: "read",
    parameters: {
      type: "object",
      properties: {
        limit: { type: "number" },
        search: { type: "string" },
        platform: { type: "string" },
        metric: { type: "string" },
      },
    },
  },
  {
    name: "get_related_eximents",
    description: "Find related historical experiments (read-only).",
    risk: "read",
    parameters: {
      type: "object",
      properties: { experimentId: { type: "string" } },
      required: ["experimentId"],
    },
  },
  {
    name: "get_experiment_conflicts",
    description: "Surface conflicting historical experiment findings (read-only).",
    risk: "read",
    parameters: {
      type: "object",
      properties: { experimentId: { type: "string" } },
      required: ["experimentId"],
    },
  },
  {
    name: "get_experiment_evaluation",
    description:
      "Get normalized experiment evaluation from measurement snapshot (read-only, no AI credits).",
    risk: "read",
    parameters: {
      type: "object",
      properties: { experimentId: { type: "string" } },
      required: ["experimentId"],
    },
  },
  {
    name: "get_historical_experiment_evidence",
    description:
      "Aggregate completed experiment evidence by platform/metric (read-only, no AI credits).",
    risk: "read",
    parameters: {
      type: "object",
      properties: {
        platform: { type: "string" },
        metric: { type: "string" },
        objectiveContains: { type: "string" },
        limit: { type: "number" },
      },
    },
  },
  {
    name: "get_cross_experiment_evidence",
    description: "Cross-experiment observed patterns (read-only, deterministic).",
    risk: "read",
    parameters: {
      type: "object",
      properties: {
        platform: { type: "string" },
        metric: { type: "string" },
        objectiveContains: { type: "string" },
        limit: { type: "number" },
      },
    },
  },
  {
    name: "get_cross_experiment_learnings",
    description: "Learning outcomes linked to experiments (read-only).",
    risk: "read",
    parameters: {
      type: "object",
      properties: {
        experimentId: { type: "string" },
        limit: { type: "number" },
      },
    },
  },
  {
    name: "get_evidence_relationships",
    description: "Evidence graph relationships for an experiment (read-only).",
    risk: "read",
    parameters: {
      type: "object",
      properties: { experimentId: { type: "string" } },
      required: ["experimentId"],
    },
  },
  {
    name: "get_evidence_conflicts",
    description: "Conflicting experiment evidence in workspace (read-only).",
    risk: "read",
    parameters: {
      type: "object",
      properties: { experimentId: { type: "string" } },
    },
  },
  {
    name: "get_optimization_outcome",
    description:
      "Read measured outcome for an executed allocation optimization (read-only). Separates execution from post-change observation.",
    risk: "read",
    parameters: {
      type: "object",
      properties: { proposalId: { type: "string" } },
      required: ["proposalId"],
    },
  },
  {
    name: "get_optimization_outcomes",
    description:
      "List optimization outcomes after measurement (read-only). No ranking or automatic recommendations.",
    risk: "read",
    parameters: {
      type: "object",
      properties: {
        status: { type: "string" },
        experimentId: { type: "string" },
        platform: { type: "string" },
        metric: { type: "string" },
        limit: { type: "number" },
      },
    },
  },
  {
    name: "get_optimization_proposals",
    description:
      "List optimization readiness proposals (read-only). Does not approve or execute.",
    risk: "read",
    parameters: {
      type: "object",
      properties: { limit: { type: "number" } },
    },
  },
  {
    name: "get_optimization_eligibility",
    description:
      "Deterministic eligibility for an optimization change (read-only, no confidence score).",
    risk: "read",
    parameters: {
      type: "object",
      properties: {
        sourceType: { type: "string" },
        sourceId: { type: "string" },
        proposalType: { type: "string" },
      },
      required: ["sourceType", "sourceId"],
    },
  },
  {
    name: "preview_optimization",
    description:
      "Simulation preview for a proposal or hypothetical state change (projection only).",
    risk: "read",
    parameters: {
      type: "object",
      properties: {
        proposalId: { type: "string" },
        proposalType: { type: "string" },
        currentState: { type: "object" },
        proposedState: { type: "object" },
      },
    },
  },
  {
    name: "prepare_optimization_proposal",
    description:
      "Create a DRAFT optimization proposal for human review. Never approves or executes.",
    risk: "write",
    parameters: {
      type: "object",
      properties: {
        sourceType: { type: "string" },
        sourceId: { type: "string" },
        proposalType: { type: "string" },
        objective: { type: "string" },
        proposedState: { type: "object" },
      },
      required: ["sourceType", "sourceId"],
    },
  },
  {
    name: "execute_optimization",
    description:
      "Prepare executing an APPROVED allocation proposal. Requires explicit user confirmation — never executes from general questions.",
    risk: "external",
    parameters: {
      type: "object",
      properties: { proposalId: { type: "string" } },
      required: ["proposalId"],
    },
  },
  {
    name: "rollback_optimization",
    description:
      "Prepare rolling back an executed allocation proposal. Requires explicit user confirmation.",
    risk: "external",
    parameters: {
      type: "object",
      properties: { proposalId: { type: "string" } },
      required: ["proposalId"],
    },
  },
  {
    name: "create_strategic_plan",
    description:
      "Generate an evidence-backed strategic plan (analytics, Brand Brain, growth brief). Returns review URL only — never executes or publishes.",
    risk: "write",
    parameters: {
      type: "object",
      properties: {
        objective: { type: "string" },
        strategyType: {
          type: "string",
          enum: [
            "content_growth",
            "engagement_recovery",
            "audience_growth",
            "campaign_push",
            "consistency",
            "performance_optimization",
            "custom",
          ],
        },
        growthBriefId: { type: "string" },
        instructions: { type: "string" },
        includeAlternatives: { type: "boolean" },
      },
      required: ["objective"],
    },
  },
  {
    name: "prepare_publish_post",
    description: "Prepare a publish action requiring user confirmation.",
    risk: "external",
    parameters: {
      type: "object",
      properties: {
        socialAccountId: { type: "string" },
        contentId: { type: "string" },
        caption: { type: "string" },
        mediaUrl: { type: "string" },
      },
      required: ["socialAccountId"],
    },
  },
  {
    name: "prepare_schedule_post",
    description: "Prepare a schedule action requiring user confirmation.",
    risk: "external",
    parameters: {
      type: "object",
      properties: {
        socialAccountId: { type: "string" },
        contentId: { type: "string" },
        caption: { type: "string" },
        mediaUrl: { type: "string" },
        scheduledFor: { type: "string" },
        timezone: { type: "string" },
      },
      required: ["socialAccountId", "scheduledFor"],
    },
  },
  {
    name: "prepare_cancel_post",
    description: "Prepare cancelling a scheduled post. Requires confirmation.",
    risk: "write",
    parameters: {
      type: "object",
      properties: { postId: { type: "string" } },
      required: ["postId"],
    },
  },
  {
    name: "prepare_create_campaign",
    description: "Prepare creating a campaign. Requires confirmation.",
    risk: "write",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string" },
        objective: { type: "string" },
        description: { type: "string" },
        startDate: { type: "string" },
        endDate: { type: "string" },
      },
      required: ["name"],
    },
  },
];

const HANDLERS: Record<string, ToolHandler> = {
  get_analytics_overview: (ctx, args) => getAnalyticsOverviewTool(ctx, args),
  get_top_content: (ctx, args) => getTopContentTool(ctx, args),
  get_content_performance: (ctx, args) =>
    getContentPerformanceTool(ctx, args as { contentId: string }),
  list_campaigns: (ctx) => listCampaignsTool(ctx),
  get_campaign: (ctx, args) =>
    getCampaignTool(ctx, args as { campaignId: string }),
  get_campaign_performance: (ctx, args) =>
    getCampaignPerformanceTool(ctx, args as { campaignId: string }),
  list_content: (ctx) => listContentTool(ctx),
  get_content: (ctx, args) => getContentTool(ctx, args as { contentId: string }),
  search_content: (ctx, args) =>
    searchContentTool(ctx, args as { query: string; limit?: number }),
  generate_content: (ctx, args) => generateContentTool(ctx, args),
  list_scheduled_posts: (ctx) => listScheduledPostsTool(ctx),
  get_post_status: (ctx, args) =>
    getPostStatusTool(ctx, args as { postId: string }),
  list_connected_accounts: (ctx) => listConnectedAccountsTool(ctx),
  get_recommendations: (ctx) => getRecommendationsTool(ctx),
  get_intelligence_overview: (ctx) => getIntelligenceOverviewTool(ctx),
  list_reports: (ctx) => listReportsTool(ctx),
  get_report: (ctx, args) => getReportTool(ctx, args as { reportId: string }),
  get_report_context: (ctx, args) =>
    getReportContextTool(ctx, args as { reportId: string }),
  get_report_snapshot: (ctx, args) =>
    getReportSnapshotTool(
      ctx,
      args as { reportId: string; snapshotId?: string }
    ),
  get_campaign_context: (ctx, args) =>
    getCampaignContextTool(ctx, args as { campaignId: string }),
  repurpose_content: (ctx, args) =>
    repurposeContentTool(
      ctx,
      args as { contentId: string; targetPlatform: string; format?: string }
    ),
  generate_content_like: (ctx, args) =>
    generateContentLikeTool(
      ctx,
      args as {
        contentId: string;
        topic?: string;
        variationCount?: number;
      }
    ),
  save_generated_content_draft: (ctx, args) =>
    saveGeneratedContentDraftTool(
      ctx,
      args as {
        brief: import("@/lib/content/types").CreativeBrief;
        creative: import("@/lib/content/types").GeneratedCreative;
      }
    ),
  create_strategy_plan: (ctx, args) =>
    createStrategyPlanTool(
      ctx,
      args as {
        objective: string;
        durationDays?: number;
        platforms?: string[];
        audience?: string;
        focus?: string;
      }
    ),
  get_strategy_plan: (ctx, args) =>
    getStrategyPlanTool(ctx, args as { planId: string }),
  update_strategy_plan: (ctx, args) =>
    updateStrategyPlanTool(
      ctx,
      args as {
        planId: string;
        title?: string;
        objective?: string;
        audience?: string;
        platforms?: string[];
        cadence?: string;
        durationDays?: number;
        contentPillars?: import("../strategy/types").StrategyPlanPillar[];
        planJson?: import("../strategy/types").StrategyPlanJson;
        status?: "draft" | "active" | "archived";
      }
    ),
  create_content_from_plan: (ctx, args) =>
    createContentFromPlanTool(
      ctx,
      args as { planId: string; count?: number; ideaIndices?: number[] }
    ),
  get_brand_context: (ctx, args) =>
    getBrandContextTool(
      ctx,
      args as { mode?: string; productId?: string; productName?: string }
    ),
  get_brand_product: (ctx, args) =>
    getBrandProductTool(
      ctx,
      args as { productId?: string; productName?: string }
    ),
  propose_save_brand_memory: async (ctx, args, meta) => {
    if (!meta?.conversationId) {
      return { error: "Missing conversation context." };
    }
    return proposeSaveBrandMemoryTool(ctx, {
      category: String(args.category ?? "preference"),
      key: String(args.key ?? ""),
      value: String(args.value ?? ""),
      conversationId: meta.conversationId,
    });
  },
  propose_learned_patterns: async (ctx, _args, meta) => {
    if (!meta?.conversationId) {
      return { error: "Missing conversation context." };
    }
    return proposeLearnedPatternsTool(ctx, {
      conversationId: meta.conversationId,
    });
  },
  get_workspace_context: (ctx) => getWorkspaceContextTool(ctx),
  generate_campaign_idea: (ctx, args) => generateCampaignIdeaTool(ctx, args),
  create_execution_plan: (ctx, args) =>
    createExecutionPlanTool(
      ctx,
      args as {
        objective?: string;
        growthBriefId?: string;
        sourceRecommendationIndex?: number;
        instructions?: string;
        prepare?: boolean;
      }
    ),
  get_learning_outcomes: (ctx, args) =>
    getLearningOutcomesTool(ctx, args as { limit?: number; status?: string }),
  get_learning_summary: (ctx) => getLearningSummaryTool(ctx),
  explain_execution_outcome: (ctx, args) =>
    explainExecutionOutcomeTool(
      ctx,
      args as { executionPlanId?: string; outcomeId?: string }
    ),
  get_strategy_evaluation: (ctx, args) =>
    getStrategyEvaluationTool(
      ctx,
      args as {
        evaluationId?: string;
        strategicPlanId?: string;
        limit?: number;
      }
    ),
  get_experiments: (ctx, args) =>
    getExperimentsTool(ctx, args as { limit?: number; status?: string }),
  get_experiment: (ctx, args) =>
    getExperimentTool(ctx, args as { experimentId?: string }),
  compare_experiment_variants: (ctx, args) =>
    compareExperimentVariantsTool(ctx, args as { experimentId?: string }),
  create_experiment_draft: (ctx, args) =>
    createExperimentDraftTool(ctx, args as { request?: string; platform?: string }),
  prepare_experiment: (ctx, args) =>
    prepareExperimentTool(ctx, args as { experimentId?: string }),
  get_experiment_intelligence: (ctx, args) =>
    getExperimentIntelligenceTool(ctx, args as { experimentId?: string }),
  get_experiment_history: (ctx, args) =>
    getExperimentHistoryTool(
      ctx,
      args as { limit?: number; search?: string; platform?: string; metric?: string }
    ),
  get_related_experiments: (ctx, args) =>
    getRelatedExperimentsTool(ctx, args as { experimentId?: string }),
  get_experiment_conflicts: (ctx, args) =>
    getExperimentConflictsTool(ctx, args as { experimentId?: string }),
  get_experiment_evaluation: (ctx, args) =>
    getExperimentEvaluationTool(ctx, args as { experimentId?: string }),
  get_historical_experiment_evidence: (ctx, args) =>
    getHistoricalExperimentEvidenceTool(
      ctx,
      args as {
        platform?: string;
        metric?: string;
        objectiveContains?: string;
        limit?: number;
      }
    ),
  get_cross_experiment_evidence: (ctx, args) =>
    getCrossExperimentEvidenceTool(
      ctx,
      args as {
        platform?: string;
        metric?: string;
        objectiveContains?: string;
        limit?: number;
      }
    ),
  get_cross_experiment_learnings: (ctx, args) =>
    getCrossExperimentLearningsTool(
      ctx,
      args as { experimentId?: string; limit?: number }
    ),
  get_evidence_relationships: (ctx, args) =>
    getEvidenceRelationshipsTool(ctx, args as { experimentId?: string }),
  get_evidence_conflicts: (ctx, args) =>
    getEvidenceConflictsTool(ctx, args as { experimentId?: string }),
  get_optimization_outcome: (ctx, args) =>
    getOptimizationOutcomeTool(ctx, args as { proposalId?: string }),
  get_optimization_outcomes: (ctx, args) =>
    getOptimizationOutcomesTool(
      ctx,
      args as {
        status?: string;
        experimentId?: string;
        platform?: string;
        metric?: string;
        limit?: number;
      }
    ),
  get_optimization_proposals: (ctx, args) =>
    getOptimizationProposalsTool(ctx, args as { limit?: number }),
  get_optimization_eligibility: (ctx, args) =>
    getOptimizationEligibilityTool(
      ctx,
      args as { sourceType?: string; sourceId?: string; proposalType?: string }
    ),
  preview_optimization: (ctx, args) =>
    previewOptimizationTool(
      ctx,
      args as {
        proposalId?: string;
        proposalType?: string;
        currentState?: Record<string, unknown>;
        proposedState?: Record<string, unknown>;
      }
    ),
  prepare_optimization_proposal: (ctx, args) =>
    prepareOptimizationProposalTool(
      ctx,
      args as {
        sourceType?: string;
        sourceId?: string;
        proposalType?: string;
        objective?: string;
        proposedState?: Record<string, unknown>;
      }
    ),
  execute_optimization: async (ctx, args, meta) => {
    if (!meta?.conversationId) return { error: "Missing conversation context." };
    return executeOptimizationTool(
      ctx,
      args as { proposalId?: string },
      { conversationId: meta.conversationId }
    );
  },
  rollback_optimization: async (ctx, args, meta) => {
    if (!meta?.conversationId) return { error: "Missing conversation context." };
    return rollbackOptimizationTool(
      ctx,
      args as { proposalId?: string },
      { conversationId: meta.conversationId }
    );
  },
  create_strategic_plan: (ctx, args) =>
    createStrategicPlanTool(ctx, {
      objective: args.objective ? String(args.objective) : undefined,
      strategyType: args.strategyType as import("@/lib/strategist/types").StrategyType | undefined,
      growthBriefId: args.growthBriefId ? String(args.growthBriefId) : undefined,
      instructions: args.instructions ? String(args.instructions) : undefined,
      includeAlternatives: Boolean(args.includeAlternatives),
    }),
  prepare_publish_post: async (ctx, args, meta) => {
    if (!meta?.conversationId) return { error: "Missing conversation context." };
    return preparePublishPost(ctx, {
      socialAccountId: String(args.socialAccountId ?? ""),
      contentId: args.contentId ? String(args.contentId) : undefined,
      caption: args.caption ? String(args.caption) : undefined,
      mediaUrl: args.mediaUrl ? String(args.mediaUrl) : undefined,
      conversationId: meta.conversationId,
    });
  },
  prepare_schedule_post: async (ctx, args, meta) => {
    if (!meta?.conversationId) return { error: "Missing conversation context." };
    return prepareSchedulePost(ctx, {
      socialAccountId: String(args.socialAccountId ?? ""),
      contentId: args.contentId ? String(args.contentId) : undefined,
      caption: args.caption ? String(args.caption) : undefined,
      mediaUrl: args.mediaUrl ? String(args.mediaUrl) : undefined,
      scheduledFor: String(args.scheduledFor ?? ""),
      timezone: args.timezone ? String(args.timezone) : undefined,
      conversationId: meta.conversationId,
    });
  },
  prepare_cancel_post: async (ctx, args, meta) => {
    if (!meta?.conversationId) return { error: "Missing conversation context." };
    return prepareCancelPost(ctx, {
      postId: String(args.postId ?? ""),
      conversationId: meta.conversationId,
    });
  },
  prepare_create_campaign: async (ctx, args, meta) => {
    if (!meta?.conversationId) return { error: "Missing conversation context." };
    return prepareCreateCampaign(ctx, {
      name: String(args.name ?? ""),
      objective: args.objective ? String(args.objective) : undefined,
      description: args.description ? String(args.description) : undefined,
      startDate: args.startDate ? String(args.startDate) : undefined,
      endDate: args.endDate ? String(args.endDate) : undefined,
      conversationId: meta.conversationId,
    });
  },
};

export function openAIToolDefinitions() {
  return ASSISTANT_TOOLS.map((tool) => ({
    type: "function" as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }));
}

export function getToolRisk(name: string): ToolRiskLevel {
  return ASSISTANT_TOOLS.find((t) => t.name === name)?.risk ?? "read";
}

export function getToolStatusLabel(name: string): string {
  return TOOL_STATUS_LABELS[name] ?? "Working...";
}

export async function executeTool(
  ctx: AssistantContext,
  name: string,
  args: Record<string, unknown>,
  meta?: { conversationId: string }
): Promise<unknown> {
  const handler = HANDLERS[name];
  if (!handler) {
    return { error: `Unknown tool: ${name}` };
  }

  try {
    return await handler(ctx, args, meta);
  } catch (error) {
    if (error instanceof AssistantPermissionError) {
      return { error: error.message };
    }
    const message = error instanceof Error ? error.message : "Tool failed.";
    return { error: message };
  }
}

export function sanitizeToolResult(result: unknown): unknown {
  const json = JSON.stringify(result);
  const sensitive = [
    "access_token",
    "refresh_token",
    "encrypted",
    "token",
    "secret",
    "api_key",
  ];
  if (sensitive.some((key) => json.toLowerCase().includes(key))) {
    return { error: "Result contained sensitive data and was redacted." };
  }
  return result;
}
