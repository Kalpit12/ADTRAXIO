import type {
  AttributionReport,
  ExperimentRecord,
  ExperimentVariantRecord,
} from "./types";

export function validateExperimentAttribution(
  experiment: ExperimentRecord,
  variants: ExperimentVariantRecord[]
): AttributionReport {
  const associations: string[] = [];
  const limitations: string[] = [
    "Measurement association does not establish causation for the outcome.",
  ];

  let linked = 0;
  for (const v of variants) {
    if (v.contentId) {
      associations.push(
        `Variant ${v.variantKey}: measurement is associated with content ID ${v.contentId}.`
      );
      linked += 1;
    }
    if (v.scheduledPostId) {
      associations.push(
        `Variant ${v.variantKey}: measurement is associated with scheduled post ${v.scheduledPostId}.`
      );
      linked += 1;
    }
    if (v.campaignId) {
      associations.push(
        `Variant ${v.variantKey}: measurement is associated with campaign ${v.campaignId}.`
      );
      linked += 1;
    }
  }

  if (experiment.platform) {
    associations.push(`Workspace platform context: ${experiment.platform}.`);
  }
  if (experiment.startedAt) {
    associations.push(`Observation began at ${experiment.startedAt}.`);
  }

  if (!linked && experiment.status !== "draft") {
    limitations.push("No variant content, post, or campaign linkage for attribution.");
    return {
      status: "unavailable",
      associations,
      limitations,
    };
  }

  if (linked < variants.length) {
    limitations.push("Some variants lack direct asset linkage.");
    return { status: "limited", associations, limitations };
  }

  return { status: "associated", associations, limitations };
}
