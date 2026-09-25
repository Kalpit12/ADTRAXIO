"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SocialAuthButtonProps {
  loading?: boolean;
  disabled?: boolean;
  onClick: () => void;
  configured?: boolean;
}

export function SocialAuthButton({
  loading,
  disabled,
  onClick,
  configured = true,
}: SocialAuthButtonProps) {
  return (
    <Button
      type="button"
      variant="outline"
      size="cta"
      disabled={disabled || loading || !configured}
      onClick={onClick}
      className={cn(
        "w-full border-border bg-adtraxio-surface/60 hover:bg-adtraxio-surface",
        !configured && "opacity-60"
      )}
    >
      {loading ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <GoogleIcon />
      )}
      Continue with Google
    </Button>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.4c-.2 1.2-1.5 3.6-5.4 3.6-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.2.8 3.9 1.5l2.7-2.6C17.5 2.7 15 1.5 12 1.5 6.8 1.5 2.5 5.8 2.5 11s4.3 9.5 9.5 9.5c5.5 0 9.1-3.9 9.1-9.3 0-.6-.1-1.1-.2-1.5H12z"
      />
    </svg>
  );
}
