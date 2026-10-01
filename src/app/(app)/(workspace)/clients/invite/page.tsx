"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { WorkspaceError } from "@/components/workspaces/workspace-error";
import { Button } from "@/components/ui/button";
import { friendlyWorkspaceError } from "@/lib/workspaces/display";

function InviteAcceptContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("This invitation link is invalid or incomplete.");
      return;
    }

    void (async () => {
      try {
        const response = await fetch("/api/clients/invite/accept", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        const payload = (await response.json()) as {
          ok?: boolean;
          error?: string;
        };

        if (!response.ok) {
          setStatus("error");
          setMessage(
            friendlyWorkspaceError(
              payload.error ?? "Unable to accept invitation."
            )
          );
          return;
        }

        setStatus("success");
        setMessage("You're in. Opening your workspace…");
        router.push("/dashboard");
        router.refresh();
      } catch {
        setStatus("error");
        setMessage("Unable to accept invitation.");
      }
    })();
  }, [token, router]);

  return (
    <div className="mx-auto max-w-md space-y-8 py-8">
      <PageHeader
        eyebrow="Invitation"
        title="Join client workspace"
        description="Accepting adds this workspace to your account."
      />

      {status === "loading" && (
        <div className="space-y-3" aria-busy="true">
          <div className="h-4 w-48 animate-pulse rounded bg-secondary/30" />
          <p className="text-sm text-muted-foreground">Confirming invitation…</p>
        </div>
      )}

      {status === "success" && (
        <p className="text-sm text-foreground" role="status">{message}</p>
      )}

      {status === "error" && (
        <>
          <WorkspaceError message={message} />
          <Button asChild variant="outline" size="sm">
            <Link href="/clients">Go to client workspaces</Link>
          </Button>
        </>
      )}
    </div>
  );
}

export default function ClientInvitePage() {
  return (
    <Suspense
      fallback={
        <p className="text-sm text-muted-foreground">Loading invitation…</p>
      }
    >
      <InviteAcceptContent />
    </Suspense>
  );
}
