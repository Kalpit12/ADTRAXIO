import type { BrandBrainContext } from "./types";

export function serializeBrandBrainCompact(
  brain: BrandBrainContext,
  mode: "full" | "generation" | "strategy" = "generation"
): string {
  const sections: string[] = [];
  const profile = brain.profile;

  if (profile) {
    const brandLines = [
      profile.businessName ? `Business: ${profile.businessName}` : null,
      profile.industry ? `Industry: ${profile.industry}` : null,
      profile.description ? `About: ${profile.description}` : null,
    ].filter(Boolean);
    if (brandLines.length) {
      sections.push(`BRAND\n${brandLines.join("\n")}`);
    }

    if (profile.targetAudience) {
      sections.push(`AUDIENCE\n${profile.targetAudience}`);
    }

    const voice = [profile.brandVoice, profile.tone].filter(Boolean).join(", ");
    if (voice) sections.push(`VOICE\n${voice}`);

    if (profile.contentPillars.length) {
      sections.push(
        `CONTENT PILLARS\n${profile.contentPillars.map((p, i) => `${i + 1}. ${p}`).join("\n")}`
      );
    }

    if (profile.brandRules.length || profile.avoidWords.length) {
      const rules = [
        ...profile.brandRules,
        profile.avoidWords.length
          ? `Avoid words: ${profile.avoidWords.join(", ")}`
          : "",
      ].filter(Boolean);
      sections.push(`RULES\n${rules.join("\n")}`);
    }

    if (profile.goals.length && mode !== "generation") {
      sections.push(`GOALS\n${profile.goals.join("\n")}`);
    }

    if (profile.preferredCtas.length && mode === "generation") {
      sections.push(`PREFERRED CTAs\n${profile.preferredCtas.join(" | ")}`);
    }
  }

  if (brain.product) {
    const p = brain.product;
    sections.push(
      `PRODUCT: ${p.name}\n${p.description ?? ""}\nBenefits: ${p.keyBenefits.join("; ") || "—"}\nDifferentiators: ${p.differentiators.join("; ") || "—"}\nApproved claims (use only these): ${p.approvedClaims.join("; ") || "None on file"}\nProhibited: ${p.prohibitedClaims.join("; ") || "—"}`
    );
  } else if (mode === "full" && brain.products.length) {
    sections.push(
      `PRODUCTS\n${brain.products
        .slice(0, 8)
        .map((p) => `- ${p.name}`)
        .join("\n")}`
    );
  }

  if (brain.memories.length) {
    sections.push(
      `APPROVED MEMORIES\n${brain.memories
        .slice(0, 12)
        .map((m) => `- [${m.category}] ${m.key}: ${m.value}`)
        .join("\n")}`
    );
  }

  return sections.length > 0
    ? sections.join("\n\n")
    : "No approved Brand Brain on file for this workspace.";
}
