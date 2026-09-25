"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { OnboardingLayout } from "@/components/onboarding/onboarding-layout";
import { OnboardingNav } from "@/components/onboarding/onboarding-nav";
import { OnboardingProgress } from "@/components/onboarding/onboarding-progress";
import { AccountTypeStep } from "@/components/onboarding/steps/account-type-step";
import { GoalsStep } from "@/components/onboarding/steps/goals-step";
import { PlatformsStep } from "@/components/onboarding/steps/platforms-step";
import { ProfileStep } from "@/components/onboarding/steps/profile-step";
import { ReviewStep } from "@/components/onboarding/steps/review-step";
import { WelcomeStep } from "@/components/onboarding/steps/welcome-step";
import {
  completeOnboarding,
  loadOnboardingData,
  saveOnboardingProgress,
} from "@/lib/onboarding/service";
import type { OnboardingData, OnboardingStepIndex } from "@/lib/onboarding/types";
import { defaultOnboardingData } from "@/lib/onboarding/types";
import {
  validateOnboardingStep,
  type StepErrors,
} from "@/lib/onboarding/validation";

const stepTransition = {
  initial: { opacity: 0, x: 16 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -16 },
};

export function OnboardingWizard() {
  const router = useRouter();
  const [data, setData] = useState<OnboardingData>(defaultOnboardingData());
  const [errors, setErrors] = useState<StepErrors>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const step = data.step;

  const loadProgress = useCallback(async () => {
    setLoading(true);
    const result = await loadOnboardingData();
    setLoading(false);

    if (result.error) {
      setFormError(result.error);
      return;
    }

    if (result.data) {
      if (result.data.onboardingCompleted) {
        router.replace("/dashboard");
        return;
      }
      setData(result.data);
    }
  }, [router]);

  useEffect(() => {
    loadProgress();
  }, [loadProgress]);

  function updateData(updates: Partial<OnboardingData>) {
    setData((prev) => ({ ...prev, ...updates }));
    setErrors({});
    setFormError("");
  }

  async function persist(nextData: OnboardingData) {
    const result = await saveOnboardingProgress(nextData);
    if (result.error) {
      setFormError(result.error);
      return false;
    }
    if (result.data) setData(result.data);
    return true;
  }

  async function goToStep(nextStep: OnboardingStepIndex) {
    const nextData = { ...data, step: nextStep };
    setSaving(true);
    const ok = await persist(nextData);
    setSaving(false);
    if (!ok) return;
    setErrors({});
  }

  async function handleContinue() {
    if (step === 0) {
      await goToStep(1);
      return;
    }

    const stepErrors = validateOnboardingStep(step, data);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      return;
    }

    if (step === 5) {
      setSaving(true);
      const result = await completeOnboarding(data);
      setSaving(false);

      if (result.error) {
        setFormError(result.error);
        return;
      }

      router.push("/dashboard");
      return;
    }

    await goToStep((step + 1) as OnboardingStepIndex);
  }

  async function handleBack() {
    if (step <= 1) return;
    await goToStep((step - 1) as OnboardingStepIndex);
  }

  if (loading) {
    return (
      <OnboardingLayout>
        <div className="flex min-h-[280px] items-center justify-center">
          <p className="text-sm text-muted-foreground">Loading your progress…</p>
        </div>
      </OnboardingLayout>
    );
  }

  return (
    <OnboardingLayout>
      <OnboardingProgress currentStep={step} />

      {formError && (
        <p
          className="mb-4 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300"
          role="alert"
        >
          {formError}
        </p>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={stepTransition.initial}
          animate={stepTransition.animate}
          exit={stepTransition.exit}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        >
          {step === 0 && <WelcomeStep onContinue={handleContinue} />}

          {step === 1 && (
            <AccountTypeStep
              value={data.accountType}
              onChange={(accountType) => updateData({ accountType })}
              error={errors.accountType}
            />
          )}

          {step === 2 && (
            <GoalsStep
              value={data.goals}
              onChange={(goals) => updateData({ goals })}
              error={errors.goals}
            />
          )}

          {step === 3 && data.accountType && (
            <ProfileStep
              accountType={data.accountType}
              data={data}
              onChange={updateData}
              errors={errors}
            />
          )}

          {step === 4 && (
            <PlatformsStep
              platforms={data.platforms}
              connectLater={data.connectPlatformsLater}
              onPlatformsChange={(platforms) => updateData({ platforms })}
              onConnectLaterChange={(connectPlatformsLater) =>
                updateData({ connectPlatformsLater })
              }
              error={errors.platforms}
            />
          )}

          {step === 5 && <ReviewStep data={data} />}
        </motion.div>
      </AnimatePresence>

      {step > 0 && (
        <OnboardingNav
          showBack={step > 1}
          onBack={handleBack}
          onContinue={handleContinue}
          loading={saving}
          continueLabel={step === 5 ? "Enter ADTRAXIO →" : "Continue"}
          finalStep={step === 5}
        />
      )}
    </OnboardingLayout>
  );
}
