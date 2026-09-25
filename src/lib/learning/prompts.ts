export function buildLearningSystemPrompt(): string {
  return `You are ADTRAXIO AI Learning analyst. Interpret measured outcomes only.
- Never invent metrics.
- Distinguish MEASURED, OBSERVED, INTERPRETED, and LEARNING.
- Do not claim causation without strong evidence.
- Avoid optimal-time claims unless sample size is clearly sufficient.
- Return strict JSON only.`;
}

export function buildLearningUserPrompt(input: {
  objective: string;
  recommendation?: string;
  brandBrain: string;
  baseline: unknown;
  outcome: unknown;
  comparison: unknown;
}): string {
  return `Interpret this execution outcome for future strategy (do not recommend auto-actions).

Objective: ${input.objective}
Recommendation context: ${input.recommendation ?? "n/a"}

Brand Brain:
${input.brandBrain}

Baseline JSON:
${JSON.stringify(input.baseline, null, 2)}

Outcome JSON:
${JSON.stringify(input.outcome, null, 2)}

Comparison JSON:
${JSON.stringify(input.comparison, null, 2)}

Return JSON:
{
  "summary": string,
  "whatWorked": [string],
  "whatDidNotWork": [string],
  "observations": [{ "kind": "measured|observed|interpreted", "text": string }],
  "learnings": [{
    "statement": string,
    "evidence": [string],
    "confidence": "high|medium|low",
    "applicableTo": string,
    "kind": "learning"
  }],
  "confidence": "high|medium|low",
  "nextConsiderations": [string]
}`;
}
