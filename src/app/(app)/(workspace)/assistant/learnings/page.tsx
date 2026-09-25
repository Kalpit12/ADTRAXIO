import { LearningsPageView } from "@/components/assistant/learnings-page-view";

export const metadata = {
  title: "AI learnings — ADTRAXIO AI",
};

export default function LearningsPage() {
  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-background">
      <LearningsPageView />
    </div>
  );
}
