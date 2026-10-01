/** Public marketing / homepage constants — shared with app shell where useful. */

export const MARKETING_CTA = {
  primary: "Get started",
  primaryHref: "/signup",
  secondary: "See how it works",
  secondaryHref: "#platform",
  login: "Log in",
} as const;

export const GROWTH_LOOP = [
  {
    id: "create",
    label: "Create",
    tagline: "Turn a brief into platform-ready content.",
    href: "#create",
  },
  {
    id: "analyze",
    label: "Analyze",
    tagline: "See what is actually driving growth.",
    href: "#analyze",
  },
  {
    id: "plan",
    label: "Plan",
    tagline: "Turn performance into your next move.",
    href: "#plan",
  },
  {
    id: "act",
    label: "Act",
    tagline: "Move from recommendation to execution.",
    href: "#act",
  },
  {
    id: "learn",
    label: "Learn",
    tagline: "Build strategy from what really happened.",
    href: "#learn",
  },
] as const;

export const AUDIENCE_SEGMENTS = [
  "Content creators",
  "DTC brands",
  "Marketing agencies",
  "In-house growth teams",
  "Social managers",
  "Founders",
] as const;
