import { randomUUID } from "crypto";
import {
  ALLOWED_STRATEGIC_ACTION_TYPES,
  type AiStrategicPlanOutput,
  type ConfidenceLevel,
  type StrategicAction,
  type StrategicAlternative,
  type StrategicEvidenceItem,
  type StrategicInsight,
  type StrategyType,
} from "./types";

const STRATEGY_TYPES = new Set<StrategyType>([
  "content_growth",
  "engagement_recovery",
  "audience_growth",
  "campaign_push",
  "consistency",
  "performance_optimization",
  "custom",
]);

const CONFIDENCE = new Set<ConfidenceLevel>(["high", "medium", "low"]);

const SECRET_PATTERNS = [
  /sk-[a-zA-Z0-9]{10,}/,
  /SUPABASE_SERVICE_ROLE/i,
  /OPENAI_API_KEY/i,
  /Bearer\s+[a-zA-Z0-9._-]+/i,
];

export class StrategicPlanValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StrategicPlanValidationError";
  }
}

function assertNoSecrets(value: string) {
  for (const pattern of SECRET_PATTERNS) {
    if (pattern.test(value)) {
      throw new StrategicPlanValidationError("Generated content contained forbidden patterns.");
    }
  }
}

function asAction(raw: AiStrategicPlanOutput["actions"][number]): StrategicAction {
  const type = String(raw.type ?? "").trim() as StrategicAction["type"];
  if (!ALLOWED_STRATEGIC_ACTION_TYPES.has(type)) {
    throw new StrategicPlanValidationError(`Invalid action type: ${raw.type}`);
  }
  const title = String(raw.title ?? "").trim();
  if (!title) {
    throw new StrategicPlanValidationError("Action title is required.");
  }
  return {
    id: randomUUID(),
    title,
    reason: String(raw.reason ?? "").trim(),
    evidence: Array.isArray(raw.evidence)
      ? raw.evidence.filter((e) => typeof e === "string").slice(0, 8)
      : [],
    priority: (["high", "medium", "low"].includes(raw.priority)
      ? raw.priority
      : "medium") as StrategicAction["priority"],
    confidence: CONFIDENCE.has(raw.confidence as ConfidenceLevel)
      ? (raw.confidence as ConfidenceLevel)
      : "medium",
    type,
    platform: raw.platform ? String(raw.platform) : null,
    target: raw.target ? String(raw.target) : null,
    instructions: raw.instructions ? String(raw.instructions) : null,
    input:
      raw.input && typeof raw.input === "object"
        ? (raw.input as Record<string, unknown>)
        : {},
    reviewStatus: "pending",
  };
}

function parseEvidence(raw: unknown): StrategicEvidenceItem[] {
  if (!Array.isArray(raw)) return [];
  const out: StrategicEvidenceItem[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const interpretation = String(row.interpretation ?? "observed");
    if (
      !["measured", "observed", "interpreted", "recommended"].includes(interpretation)
    ) {
      continue;
    }
    out.push({
      metric: String(row.metric ?? "").slice(0, 200),
      value: String(row.value ?? "").slice(0, 500),
      period: String(row.period ?? "").slice(0, 120),
      source: String(row.source ?? "").slice(0, 120),
      interpretation: interpretation as StrategicEvidenceItem["interpretation"],
    });
  }
  return out.slice(0, 24);
}

function parseInsights(raw: unknown): StrategicInsight[] {
  if (!Array.isArray(raw)) return [];
  const out: StrategicInsight[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const kind = String(row.kind ?? row.type ?? "observed");
    if (!["measured", "observed", "interpreted", "recommended"].includes(kind)) {
      continue;
    }
    const title = String(row.title ?? "").trim();
    const body = String(row.body ?? row.observation ?? "").trim();
    if (!title || !body) continue;
    out.push({
      kind: kind as StrategicInsight["kind"],
      title: title.slice(0, 200),
      body: body.slice(0, 1200),
    });
  }
  return out.slice(0, 12);
}

function parseAlternatives(raw: unknown): StrategicAlternative[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined;
  const alternatives: StrategicAlternative[] = [];
  for (const item of raw.slice(0, 3)) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const label = String(row.label ?? "").trim();
    const summary = String(row.summary ?? "").trim();
    const actionsRaw = row.actions;
    if (!label || !summary || !Array.isArray(actionsRaw)) continue;
    alternatives.push({
      label: label.slice(0, 80),
      summary: summary.slice(0, 600),
      actions: actionsRaw.map((a) => asAction(a as AiStrategicPlanOutput["actions"][number])),
    });
  }
  return alternatives.length ? alternatives : undefined;
}

export function validateStrategicPlanOutput(raw: unknown): {
  objective: string;
  summary: string;
  strategyType: StrategyType;
  confidence: ConfidenceLevel;
  evidence: StrategicEvidenceItem[];
  insights: StrategicInsight[];
  actions: StrategicAction[];
  alternatives?: StrategicAlternative[];
  currentSituation?: string;
  historicalEvidence?: AiStrategicPlanOutput["historicalEvidence"];
  adaptations?: AiStrategicPlanOutput["adaptations"];
  mixedEvidenceNote?: string;
} {
  if (!raw || typeof raw !== "object") {
    throw new StrategicPlanValidationError("AI output was not an object.");
  }
  const obj = raw as Record<string, unknown>;
  const objective = String(obj.objective ?? "").trim();
  const summary = String(obj.summary ?? "").trim();
  if (!objective || !summary) {
    throw new StrategicPlanValidationError("objective and summary are required.");
  }
  assertNoSecrets(JSON.stringify(obj));

  const strategyType = String(obj.strategyType ?? "custom") as StrategyType;
  if (!STRATEGY_TYPES.has(strategyType)) {
    throw new StrategicPlanValidationError(`Invalid strategyType: ${obj.strategyType}`);
  }

  const confidence = String(obj.confidence ?? "medium") as ConfidenceLevel;
  if (!CONFIDENCE.has(confidence)) {
    throw new StrategicPlanValidationError("Invalid confidence level.");
  }

  const actionsRaw = obj.actions;
  if (!Array.isArray(actionsRaw) || actionsRaw.length === 0) {
    throw new StrategicPlanValidationError("At least one action is required.");
  }
  const actions = actionsRaw.map((a) =>
    asAction(a as AiStrategicPlanOutput["actions"][number])
  );

  return {
    objective,
    summary,
    strategyType,
    confidence,
    evidence: parseEvidence(obj.evidence),
    insights: parseInsights(obj.insights),
    actions,
    alternatives: parseAlternatives(obj.alternatives),
    currentSituation: obj.currentSituation
      ? String(obj.currentSituation).slice(0, 2000)
      : undefined,
    historicalEvidence: Array.isArray(obj.historicalEvidence)
      ? (obj.historicalEvidence as AiStrategicPlanOutput["historicalEvidence"])
      : undefined,
    adaptations: Array.isArray(obj.adaptations)
      ? (obj.adaptations as AiStrategicPlanOutput["adaptations"])
      : undefined,
    mixedEvidenceNote: obj.mixedEvidenceNote
      ? String(obj.mixedEvidenceNote).slice(0, 1000)
      : undefined,
  };
}
