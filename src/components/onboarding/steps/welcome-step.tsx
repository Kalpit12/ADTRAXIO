"use client";

interface WelcomeStepProps {
  onContinue: () => void;
}

export function WelcomeStep({ onContinue }: WelcomeStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl tracking-tight text-foreground sm:text-3xl">
          Let&apos;s set up your growth workspace.
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
          A few quick questions help ADTRAXIO tailor your content, campaigns and
          recommendations.
        </p>
      </div>

      <button
        type="button"
        onClick={onContinue}
        className="inline-flex h-10 w-full items-center justify-center rounded-md bg-adtraxio-accent px-5 text-sm font-medium text-primary-foreground transition-transform hover:bg-adtraxio-accent/90 hover:-translate-y-px active:translate-y-0 sm:w-auto"
      >
        Continue →
      </button>
    </div>
  );
}
