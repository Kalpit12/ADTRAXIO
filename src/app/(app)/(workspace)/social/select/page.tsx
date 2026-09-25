import { Suspense } from "react";
import { SocialAccountSelectView } from "@/components/social/social-account-select-view";

export const metadata = {
  title: "Select accounts — ADTRAXIO",
};

export default function SocialSelectPage() {
  return (
    <Suspense
      fallback={<div className="h-40 animate-pulse rounded-md bg-secondary/30" />}
    >
      <SocialAccountSelectView />
    </Suspense>
  );
}
