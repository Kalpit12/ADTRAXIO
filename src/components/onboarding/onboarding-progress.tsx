"use client";

import { cn } from "@/lib/utils";
import { PROGRESS_STEPS } from "@/lib/onboarding/constants";

interface OnboardingProgressProps {
  currentStep: number;
}

export function OnboardingProgress({ currentStep }: OnboardingProgressProps) {
  if (currentStep === 0) return null;

  return (
    <nav aria-label="Onboarding progress" className="mb-8">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-2 sm:gap-x-3">
        {PROGRESS_STEPS.map((step, index) => {
          const stepNumber = index + 1;
          const isActive = currentStep === stepNumber;
          const isComplete = currentStep > stepNumber;

          return (
            <li key={step.id} className="flex items-center gap-2">
              <span
                className={cn(
                  "flex size-6 items-center justify-center rounded-full border text-[10px] font-medium tabular-nums transition-colors",
                  isActive &&
                    "border-adtraxio-accent bg-adtraxio-accent/10 text-adtraxio-accent",
                  isComplete &&
                    "border-adtraxio-accent/40 bg-adtraxio-accent/5 text-adtraxio-accent/80",
                  !isActive &&
                    !isComplete &&
                    "border-border text-muted-foreground"
                )}
              >
                {String(stepNumber).padStart(2, "0")}
              </span>
              <span
                className={cn(
                  "text-xs font-medium transition-colors",
                  isActive && "text-foreground",
                  isComplete && "text-muted-foreground",
                  !isActive && !isComplete && "text-muted-foreground/60"
                )}
              >
                {step.label}
              </span>
              {index < PROGRESS_STEPS.length - 1 && (
                <span
                  className="mx-1 hidden h-px w-4 bg-border sm:block"
                  aria-hidden
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
