import type { AccountType, OnboardingData, OnboardingStepIndex } from "./types";

export type StepErrors = Record<string, string>;

export function validateOnboardingStep(
  step: OnboardingStepIndex,
  data: OnboardingData
): StepErrors {
  const errors: StepErrors = {};

  if (step === 1 && !data.accountType) {
    errors.accountType = "Select an account type to continue.";
  }

  if (step === 2 && data.goals.length === 0) {
    errors.goals = "Select at least one goal.";
  }

  if (step === 3 && data.accountType) {
    validateProfileFields(data.accountType, data, errors);
  }

  if (step === 4 && data.platforms.length === 0) {
    errors.platforms = "Select at least one platform.";
  }

  return errors;
}

function validateProfileFields(
  accountType: AccountType,
  data: OnboardingData,
  errors: StepErrors
) {
  if (!data.profileName.trim()) {
    errors.profileName =
      accountType === "business"
        ? "Business name is required."
        : accountType === "agency"
          ? "Agency name is required."
          : "Creator name is required.";
  }

  if (accountType === "business" && !data.industry.trim()) {
    errors.industry = "Industry is required.";
  }

  if (accountType === "creator" && !data.category.trim()) {
    errors.category = "Category is required.";
  }

  if (accountType === "agency") {
    if (!data.clientCount.trim()) {
      errors.clientCount = "Number of clients is required.";
    }
    if (!data.industriesServed.trim()) {
      errors.industriesServed = "Industries served is required.";
    }
  }

  if (!data.location.trim()) {
    errors.location = "Location is required.";
  }

  if (!data.description.trim()) {
    errors.description = "Description is required.";
  }
}
