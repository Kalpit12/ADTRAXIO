import type { OnboardingData } from "./types";
import { defaultOnboardingData } from "./types";

const STORAGE_KEY = "adtraxio_onboarding";
const LEGACY_STORAGE_KEYS = ["aurevo_onboarding"];

export function loadLocalOnboarding(): OnboardingData {
  if (typeof window === "undefined") {
    return defaultOnboardingData();
  }

  try {
    let raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      for (const legacyKey of LEGACY_STORAGE_KEYS) {
        raw = localStorage.getItem(legacyKey);
        if (raw) {
          localStorage.setItem(STORAGE_KEY, raw);
          localStorage.removeItem(legacyKey);
          break;
        }
      }
    }
    if (!raw) return defaultOnboardingData();
    return { ...defaultOnboardingData(), ...JSON.parse(raw) };
  } catch {
    return defaultOnboardingData();
  }
}

export function saveLocalOnboarding(data: OnboardingData) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function clearLocalOnboarding() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
  for (const legacyKey of LEGACY_STORAGE_KEYS) {
    localStorage.removeItem(legacyKey);
  }
}
