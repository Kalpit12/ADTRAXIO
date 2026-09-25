import { Suspense } from "react";
import { SocialConnectionsView } from "@/components/social/social-connections-view";

export const metadata = {
  title: "Social — ADTRAXIO",
};

export default function SocialPage() {
  return (
    <Suspense
      fallback={<div className="h-40 animate-pulse rounded-md bg-secondary/30" />}
    >
      <SocialConnectionsView />
    </Suspense>
  );
}
