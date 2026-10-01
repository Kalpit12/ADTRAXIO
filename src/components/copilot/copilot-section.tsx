import { cn } from "@/lib/utils";

interface CopilotSectionProps {
  eyebrow?: string;
  title?: string;
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "inset";
}

/** Editorial section — avoids heavy card stacks. */
export function CopilotSection({
  eyebrow,
  title,
  children,
  className,
  variant = "default",
}: CopilotSectionProps) {
  return (
    <section
      className={cn(
        variant === "default" && "border-b border-border/50 pb-6 last:border-0",
        variant === "inset" &&
          "rounded-md border border-border/60 bg-adtraxio-surface/15 px-4 py-4 sm:px-5",
        className
      )}
    >
      {(eyebrow || title) && (
        <header className="mb-3">
          {eyebrow && (
            <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground/85">
              {eyebrow}
            </p>
          )}
          {title && (
            <h3 className="font-heading text-base tracking-tight text-foreground">
              {title}
            </h3>
          )}
        </header>
      )}
      {children}
    </section>
  );
}
