"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AuthButtonProps extends React.ComponentProps<typeof Button> {
  loading?: boolean;
  success?: boolean;
}

export function AuthButton({
  loading,
  success,
  children,
  className,
  disabled,
  ...props
}: AuthButtonProps) {
  return (
    <Button
      type="submit"
      size="cta"
      disabled={disabled || loading || success}
      className={cn(
        "w-full bg-adtraxio-accent text-primary-foreground transition-transform hover:bg-adtraxio-accent/90 hover:-translate-y-px active:translate-y-0",
        success && "bg-adtraxio-accent/80",
        className
      )}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          Please wait…
        </>
      ) : success ? (
        "Success"
      ) : (
        children
      )}
    </Button>
  );
}
