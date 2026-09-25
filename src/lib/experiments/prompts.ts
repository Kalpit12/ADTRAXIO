export function buildExperimentDraftSystemPrompt(): string {
  return `You are ADTRAXIO experiment planner. Propose controlled A/B experiment drafts only.
- Label all fields as AI suggestions.
- Never start experiments, publish, schedule, allocate traffic, or spend budget.
- Do not call any variant superior or a winner.
- Use only supported metrics: engagement, impressions, reach, views, likes, comments, shares, saves.
- Return strict JSON only.`;
}

export function buildExperimentDraftUserPrompt(input: {
  userRequest: string;
  brandBrain: string;
  platform?: string | null;
}): string {
  return `Propose an experiment draft.

User request:
${input.userRequest}

Brand context:
${input.brandBrain}

Suggested platform: ${input.platform ?? "any connected"}

Return JSON:
{
  "name": string,
  "objective": string,
  "hypothesis": string,
  "platform": string|null,
  "successMetric": string,
  "secondaryMetrics": [string],
  "minimumObservationDays": number,
  "sampleTarget": number|null,
  "allocationType": "fixed_split",
  "variants": [
    { "name": string, "description": string, "variantKey": string, "allocationPercent": number }
  ],
  "suggestionsNote": string
}`;
}

export function buildExperimentInterpretSystemPrompt(): string {
  return `Interpret experiment results using only supplied deterministic data.
Distinguish MEASURED, OBSERVED, and INTERPRETED.
Never claim causation or statistical significance.
Do not use fake confidence percentages.
Return strict JSON.`;
}

export function buildExperimentInterpretUserPrompt(input: {
  experiment: unknown;
  comparison: unknown;
}): string {
  return `Experiment:
${JSON.stringify(input.experiment, null, 2)}

Deterministic comparison:
${JSON.stringify(input.comparison, null, 2)}

Return JSON:
{
  "summary": string,
  "observations": [{ "kind": "measured|observed|interpreted", "text": string }],
  "possible_explanations": [string],
  "limitations": [string],
  "next_considerations": [string],
  "confidence": "high|medium|low"
}`;
}

export function buildExperimentIntelligenceSystemPrompt(): string {
  return `You interpret experiment intelligence from deterministic facts only.
Separate MEASURED facts from OBSERVED patterns and INTERPRETED explanations.
Never fabricate metrics, experiments, causation, statistical significance, or winners.
Never recommend automatic optimization, budget changes, traffic allocation, publishing, or scheduling.
Return strict JSON only.`;
}

export function buildExperimentIntelligenceUserPrompt(input: {
  summary: unknown;
  brandBrain: string;
}): string {
  return `Brand context:
${input.brandBrain}

Deterministic experiment intelligence:
${JSON.stringify(input.summary, null, 2)}

Return JSON:
{
  "summary": string,
  "observations": [string],
  "interpretations": [string],
  "limitations": [string],
  "historical_context": [string],
  "considerations": [string]
}`;
}
