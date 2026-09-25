"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface OnboardingNavProps {
  onBack?: () => void;
  onContinue: () => void;
  continueLabel?: string;
  showBack?: boolean;
  loading?: boolean;
  finalStep?: boolean;
}

export function OnboardingNav({
  onBack,
  onContinue,
  continueLabel = "Continue",
  showBack = true,
  loading = false,
  finalStep = false,
}: OnboardingNavProps) {
  return (
    <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
      {showBack && onBack ? (
        <Button
          type="button"
          variant="ghost"
          onClick={onBack}
          disabled={loading}
          className="text-muted-foreground hover:text-foreground"
        >
          Back
        </Button>
      ) : (
        <div className="hidden sm:block" />
      )}

      <Button
        type="button"
        size="cta"
        onClick={onContinue}
        disabled={loading}
        className={cn(
          "w-full bg-adtraxio-accent text-primary-foreground hover:bg-adtraxio-accent/90 sm:w-auto sm:min-w-[140px]",
          finalStep && "sm:min-w-[180px]"
        )}
      >
        {loading ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Saving…
          </>
        ) : (
          continueLabel
        )}
      </Button>
    </div>
  );
}
