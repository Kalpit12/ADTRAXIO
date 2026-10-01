import { friendlyConnectionMessage } from "@/lib/social/connection-display";

interface ConnectionErrorProps {
  message: string;
  onRetry?: () => void;
}

export function ConnectionError({ message, onRetry }: ConnectionErrorProps) {
  return (
    <div
      role="alert"
      className="rounded-md border border-red-500/25 bg-red-500/5 px-4 py-3"
    >
      <p className="text-sm font-medium text-foreground/90">Connection failed</p>
      <p className="mt-1 text-sm text-red-200/90">
        {friendlyConnectionMessage(message)}
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 text-xs font-medium text-foreground underline-offset-2 hover:underline"
        >
          Try again
        </button>
      )}
    </div>
  );
}
