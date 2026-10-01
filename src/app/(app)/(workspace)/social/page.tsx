import { Suspense } from "react";
import { ConnectionSkeleton } from "@/components/social/connection-skeleton";
import { SocialConnectionsView } from "@/components/social/social-connections-view";

export const metadata = {
  title: "Social connections — ADTRAXIO",
};

export default function SocialPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-10">
          <div className="h-24 animate-pulse rounded-md bg-secondary/20" />
          <ConnectionSkeleton />
        </div>
      }
    >
      <SocialConnectionsView />
    </Suspense>
  );
}
