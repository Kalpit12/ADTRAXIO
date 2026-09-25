"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

function InviteAcceptContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Invalid invitation link.");
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
          clientWorkspaceId?: string;
        };

        if (!response.ok) {
          setStatus("error");
          setMessage(payload.error ?? "Unable to accept invitation.");
          return;
        }

        setStatus("success");
        setMessage("Invitation accepted. Opening client workspace…");
        router.push("/dashboard");
        router.refresh();
      } catch {
        setStatus("error");
        setMessage("Unable to accept invitation.");
      }
    })();
  }, [token, router]);

  return (
    <div className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center text-center">
      {status === "loading" && (
        <p className="text-sm text-muted-foreground">Accepting invitation…</p>
      )}
      {status === "success" && (
        <p className="text-sm text-foreground">{message}</p>
      )}
      {status === "error" && (
        <>
          <p className="text-sm text-destructive">{message}</p>
          <Button
            className="mt-4"
            variant="outline"
            size="sm"
            onClick={() => router.push("/clients")}
          >
            Go to clients
          </Button>
        </>
      )}
    </div>
  );
}

export default function ClientInvitePage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
      <InviteAcceptContent />
    </Suspense>
  );
}
