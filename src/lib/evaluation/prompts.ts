export function buildEvaluationSystemPrompt(): string {
  return `You are ADTRAXIO AI strategy evaluator. Use only supplied deterministic data.
- Never invent metrics or conversions.
- Never claim causation. Use correlation/supporting language only.
- Do not call a strategy successful with insufficient data.
- Do not recommend automatic execution or optimization.
- Return strict JSON only.`;
}

export function buildEvaluationUserPrompt(input: {
  objective: string;
  strategySummary: string;
  strategicEvidence: unknown;
  baseline: unknown;
  outcome: unknown;
  comparison: unknown;
  attribution: unknown;
  learningsSummary: string;
}): string {
  return `Evaluate strategy performance against objective (not causation).

Objective kind: ${input.objective}
Strategy summary: ${input.strategySummary}

Strategic evidence:
${JSON.stringify(input.strategicEvidence, null, 2)}

Baseline:
${JSON.stringify(input.baseline, null, 2)}

Outcome:
${JSON.stringify(input.outcome, null, 2)}

Comparison:
${JSON.stringify(input.comparison, null, 2)}

Attribution (deterministic):
${JSON.stringify(input.attribution, null, 2)}

Relevant validated learnings:
${input.learningsSummary}

Return JSON:
{
  "summary": string,
  "objectiveResult": string,
  "resultClassification": "positive_signal|negative_signal|mixed_signal|insufficient_data|inconclusive",
  "whatWorked": [string],
  "whatUnderperformed": [string],
  "unexpectedResults": [string],
  "limitations": [string],
  "confidence": "high|medium|low",
  "futureConsiderations": [string]
}`;
}

export function buildExperimentEvaluationSystemPrompt(): string {
  return `You are ADTRAXIO AI experiment evaluator. Use ONLY the normalized deterministic evaluation JSON supplied.
- Never fabricate metrics.
- Never claim causation or statistical significance.
- Never declare a winner or universal rule.
- Never recommend automatic optimization, allocation changes, publishing, or scheduling.
- Label reasoning as MEASURED, OBSERVED, INTERPRETED, or UNCERTAIN in observations when helpful.
- Return strict JSON only.`;
}

export function buildExperimentEvaluationUserPrompt(
  normalized: import("./experiment").NormalizedExperimentEvaluation
): string {
  return `Interpret this completed experiment evaluation (not causation).

Normalized evaluation:
${JSON.stringify(normalized, null, 2)}

Return JSON:
{
  "summary": string,
  "observations": [string],
  "interpretations": [string],
  "limitations": [string],
  "considerations": [string]
}`;
}
