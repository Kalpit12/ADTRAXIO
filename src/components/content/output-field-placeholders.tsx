"use client";

const OUTPUT_FIELDS = [
  {
    label: "Hook",
    placeholder: "Your generated hook will appear here",
    tall: false,
  },
  {
    label: "Headline",
    placeholder: "Your generated headline will appear here",
    tall: false,
  },
  {
    label: "Primary copy",
    placeholder: "Your generated advertising copy will appear here",
    tall: true,
  },
  {
    label: "CTA",
    placeholder: "Your recommended CTA will appear here",
    tall: false,
  },
  {
    label: "Caption",
    placeholder: "Your platform-ready caption will appear here",
    tall: true,
  },
  {
    label: "Hashtags",
    placeholder: "Relevant hashtags will appear here",
    tall: false,
  },
  {
    label: "Creative direction",
    placeholder: "Visual direction notes will appear here",
    tall: true,
  },
] as const;

interface OutputFieldPlaceholdersProps {
  dimmed?: boolean;
}

export function OutputFieldPlaceholders({
  dimmed = false,
}: OutputFieldPlaceholdersProps) {
  return (
    <div
      className={dimmed ? "space-y-0 opacity-60" : "space-y-0"}
      aria-hidden={dimmed}
    >
      {OUTPUT_FIELDS.map((field, index) => (
        <div
          key={field.label}
          className={
            index < OUTPUT_FIELDS.length - 1
              ? "border-b border-border/40 py-5"
              : "pt-5"
          }
        >
          <p className="text-sm font-medium text-foreground">{field.label}</p>
          <div
            className={
              field.tall
                ? "mt-2.5 min-h-[88px] rounded-md border border-border/50 bg-secondary/15 px-3 py-2.5"
                : "mt-2.5 min-h-[40px] rounded-md border border-border/50 bg-secondary/15 px-3 py-2.5"
            }
          >
            <p className="text-sm leading-relaxed text-muted-foreground/55">
              {field.placeholder}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
