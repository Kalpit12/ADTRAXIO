import { Suspense } from "react";
import { CreativeStudioView } from "@/components/creative-studio/creative-studio-view";

export const metadata = {
  title: "Creative Studio — ADTRAXIO",
};

export default function CreativeStudioPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading…</div>}>
      <CreativeStudioView />
    </Suspense>
  );
}
