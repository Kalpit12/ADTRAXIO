"use client";

import { SelectableCard } from "@/components/onboarding/selectable-card";
import { ACCOUNT_TYPES } from "@/lib/onboarding/constants";
import type { AccountType } from "@/lib/onboarding/types";

interface AccountTypeStepProps {
  value: AccountType | null;
  onChange: (value: AccountType) => void;
  error?: string;
}

export function AccountTypeStep({ value, onChange, error }: AccountTypeStepProps) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-foreground">
          What best describes you?
        </h2>
      </div>

      <div className="grid gap-3">
        {ACCOUNT_TYPES.map((type) => (
          <SelectableCard
            key={type.id}
            title={type.title}
            description={type.description}
            selected={value === type.id}
            onClick={() => onChange(type.id)}
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
