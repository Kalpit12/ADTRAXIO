import type { MediaErrorCategory } from "@/lib/ai/media/errors";

export function friendlyVisualErrorMessage(
  message: string | null | undefined,
  category?: string | null
): string {
  const cat = category as MediaErrorCategory | undefined;
  switch (cat) {
    case "configuration_error":
      return "Image generation is not available yet. Your workspace admin can enable it.";
    case "authentication_error":
      return "We could not reach the image service. Try again in a moment.";
    case "rate_limited":
      return "Too many image requests. Please wait a bit and try again.";
    case "invalid_request":
      return message && !looksLikeProviderLeak(message)
        ? message
        : "Check your visual description and try again.";
    case "content_policy":
      return "This description could not be used. Try different wording.";
    case "timeout":
      return "Image creation took too long. Try again with a simpler description.";
    case "storage_error":
      return "We created the image but could not save it. Try again.";
    case "provider_error":
      return "Image creation failed. Try again or adjust your description.";
    default:
      return message && !looksLikeProviderLeak(message)
        ? message
        : "Something went wrong while creating your visual.";
  }
}

function looksLikeProviderLeak(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("openai") ||
    lower.includes("api key") ||
    lower.includes("bearer") ||
    lower.includes("stack") ||
    lower.includes("elevenlabs") ||
    lower.includes("google")
  );
}
