import { ExperimentsPageView } from "@/components/assistant/experiments-page-view";

export const metadata = { title: "Experiments — ADTRAXIO AI" };

export default function ExperimentsPage() {
  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-background">
      <ExperimentsPageView />
    </div>
  );
}
