"use client";

import { AuthInput } from "@/components/auth/auth-input";
import type { AccountType, OnboardingData } from "@/lib/onboarding/types";
import type { StepErrors } from "@/lib/onboarding/validation";

interface ProfileStepProps {
  accountType: AccountType;
  data: OnboardingData;
  onChange: (updates: Partial<OnboardingData>) => void;
  errors: StepErrors;
}

export function ProfileStep({
  accountType,
  data,
  onChange,
  errors,
}: ProfileStepProps) {
  const nameLabel =
    accountType === "business"
      ? "Business name"
      : accountType === "agency"
        ? "Agency name"
        : "Creator name";

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-foreground">
          Tell us about{" "}
          {accountType === "creator"
            ? "yourself"
            : accountType === "agency"
              ? "your agency"
              : "your business"}
        </h2>
      </div>

      <div className="space-y-4">
        <AuthInput
          label={nameLabel}
          value={data.profileName}
          onChange={(e) => onChange({ profileName: e.target.value })}
          error={errors.profileName}
          placeholder={
            accountType === "business"
              ? "Acme Inc."
              : accountType === "agency"
                ? "North Social"
                : "Alex Morgan"
          }
        />

        {accountType === "business" && (
          <AuthInput
            label="Industry"
            value={data.industry}
            onChange={(e) => onChange({ industry: e.target.value })}
            error={errors.industry}
            placeholder="Technology"
          />
        )}

        {accountType === "creator" && (
          <AuthInput
            label="Category"
            value={data.category}
            onChange={(e) => onChange({ category: e.target.value })}
            error={errors.category}
            placeholder="Fitness, design, finance…"
          />
        )}

        {accountType === "agency" && (
          <>
            <AuthInput
              label="Number of clients"
              type="number"
              min={0}
              value={data.clientCount}
              onChange={(e) => onChange({ clientCount: e.target.value })}
              error={errors.clientCount}
              placeholder="12"
            />
            <AuthInput
              label="Industries you serve"
              value={data.industriesServed}
              onChange={(e) => onChange({ industriesServed: e.target.value })}
              error={errors.industriesServed}
              placeholder="Technology, retail, hospitality…"
            />
          </>
        )}

        <AuthInput
          label="Location"
          value={data.location}
          onChange={(e) => onChange({ location: e.target.value })}
          error={errors.location}
          placeholder="City, country"
        />

        <AuthInput
          label={
            accountType === "creator"
              ? "Website / portfolio"
              : "Website"
          }
          type="url"
          value={data.website}
          onChange={(e) => onChange({ website: e.target.value })}
          error={errors.website}
          placeholder="https://"
        />

        <div className="space-y-1.5">
          <label
            htmlFor="profile-description"
            className="text-xs font-medium text-muted-foreground"
          >
            {accountType === "creator"
              ? "What do you create?"
              : "Short description"}
          </label>
          <textarea
            id="profile-description"
            rows={3}
            value={data.description}
            onChange={(e) => onChange({ description: e.target.value })}
            aria-invalid={Boolean(errors.description)}
            placeholder={
              accountType === "creator"
                ? "Short-form video, tutorials, and product reviews…"
                : "What you do and who you serve…"
            }
            className="w-full resize-none rounded-md border border-border bg-adtraxio-surface/80 px-3 py-2.5 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground/50 focus:border-adtraxio-accent/50 focus:ring-2 focus:ring-adtraxio-accent/20"
          />
          {errors.description && (
            <p className="text-xs text-red-400" role="alert">
              {errors.description}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
