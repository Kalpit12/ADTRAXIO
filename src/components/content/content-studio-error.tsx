import { Button } from "@/components/ui/button";

interface ContentStudioErrorProps {
  message: string;
  aiNotConfigured?: boolean;
  onRetry?: () => void;
}

export function ContentStudioError({
  message,
  aiNotConfigured,
  onRetry,
}: ContentStudioErrorProps) {
  const friendly = aiNotConfigured
    ? "Content generation is not available until AI is configured on the server. Ask your administrator to add the required API key."
    : message.includes("OPENAI") || message.includes("API")
      ? "We could not generate content right now. Try again in a moment."
      : message;

  return (
    <div
      role="alert"
      className="rounded-md border border-red-500/25 bg-red-500/5 px-4 py-3"
    >
      <p className="text-sm text-red-200/90">{friendly}</p>
      {onRetry && !aiNotConfigured && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="mt-3"
          onClick={onRetry}
        >
          Try again
        </Button>
      )}
    </div>
  );
}
