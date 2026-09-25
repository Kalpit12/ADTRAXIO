"use client";

import { SelectableCard } from "@/components/onboarding/selectable-card";
import { ONBOARDING_GOALS } from "@/lib/onboarding/constants";
import type { OnboardingGoal } from "@/lib/onboarding/types";

interface GoalsStepProps {
  value: OnboardingGoal[];
  onChange: (goals: OnboardingGoal[]) => void;
  error?: string;
}

export function GoalsStep({ value, onChange, error }: GoalsStepProps) {
  function toggle(goal: OnboardingGoal) {
    if (value.includes(goal)) {
      onChange(value.filter((g) => g !== goal));
    } else {
      onChange([...value, goal]);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-foreground">
          What do you want to achieve?
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Select all that apply.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {ONBOARDING_GOALS.map((goal) => (
          <SelectableCard
            key={goal.id}
            title={goal.label}
            selected={value.includes(goal.id)}
            onClick={() => toggle(goal.id)}
            multi
          />
        ))}
      </div>

      {error && (
        <p className="text-xs text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
