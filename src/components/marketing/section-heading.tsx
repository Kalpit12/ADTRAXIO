import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  lead?: string;
  align?: "left" | "center";
  className?: string;
  titleClassName?: string;
}

export function SectionHeading({
  eyebrow,
  title,
  lead,
  align = "left",
  className,
  titleClassName,
}: SectionHeadingProps) {
  const centered = align === "center";

  return (
    <div
      className={cn(
        "max-w-3xl",
        centered && "mx-auto text-center",
        className
      )}
    >
      {eyebrow && (
        <p
          className={cn(
            "text-[11px] font-medium uppercase tracking-[0.22em] text-adtraxio-accent",
            centered && "mx-auto"
          )}
        >
          {eyebrow}
        </p>
      )}
      <h2
        className={cn(
          "font-heading mt-4 text-3xl leading-[1.12] tracking-tight text-foreground sm:text-4xl lg:text-[2.65rem]",
          titleClassName
        )}
      >
        {title}
      </h2>
      {lead && (
        <p
          className={cn(
            "mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg",
            centered && "mx-auto max-w-2xl"
          )}
        >
          {lead}
        </p>
      )}
    </div>
  );
}
